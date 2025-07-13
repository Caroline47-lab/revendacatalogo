// Usar 'node-fetch' pode ser necessário dependendo da versão do Node na Netlify.
const fetch = require('node-fetch');

// ========== CORREÇÃO 4: FUNÇÃO MELHORADA NO PROXY DE IMAGEM ==========
exports.handler = async (event) => {
    const url = event.queryStringParameters?.url;
    
    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "URL da imagem não fornecida" })
        };
    }

    try {
        // Decodifica e limpa a URL
        let imageUrl = decodeURIComponent(url)
            .trim()
            .replace(/\s+/g, '')
            .replace(/\n/g, '')
            .replace(/\r/g, '');

        // Corrige URLs malformadas
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            imageUrl = 'https://' + imageUrl;
        }

        // Corrige barras duplicadas
        imageUrl = imageUrl.replace(/([^:]\/)\/+/g, '$1');

        console.log("[DEBUG] Processando imagem:", {
            original: url,
            processed: imageUrl
        });
        
        const response = await fetch(imageUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
                'Accept': 'image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            },
            timeout: 15000
        });

        if (!response.ok) {
            console.error(`[ERROR] Falha ao buscar imagem:`, {
                status: response.status,
                statusText: response.statusText,
                url: imageUrl
            });
            
            return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    error: `Falha ao buscar imagem: ${response.status}`, 
                    url: imageUrl
                })
            };
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        console.log(`[DEBUG] Imagem carregada com sucesso:`, {
            size: imageBuffer.byteLength,
            contentType: contentType
        });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: Buffer.from(imageBuffer).toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error("[ERROR] Erro no proxy de imagem:", error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: `Erro ao processar imagem: ${error.message}`,
                requestedUrl: url
            })
        };
    }
};
