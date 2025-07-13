const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Adiciona headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Responde a requisições OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // A URL da imagem é recebida como um parâmetro da requisição.
    const url = event.queryStringParameters?.url;
    
    if (!url) {
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ error: "URL não fornecida" }) 
        };
    }

    try {
        // Apenas decodifica a URL para o formato original.
        const imageUrl = decodeURIComponent(url);
        
        console.log("[INFO] Proxy de Imagem buscando a URL:", imageUrl);

        const response = await fetch(imageUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://facilzap.app.br/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 10000 // 10 segundos de timeout
        });

        if (!response.ok) {
            console.error(`[ERROR] Falha ao buscar imagem no proxy:`, {
                status: response.status,
                statusText: response.statusText,
                url: imageUrl
            });
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: `Erro ${response.status}: ${response.statusText}` })
            };
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        console.log(`[INFO] Imagem processada com sucesso. Tipo: ${contentType}, Tamanho: ${imageBuffer.byteLength} bytes`);
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400' // Cache por 24 horas
            },
            body: Buffer.from(imageBuffer).toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error("[ERROR] Erro fatal no proxy de imagem:", {
            errorMessage: error.message,
            errorStack: error.stack,
            requestedUrl: url
        });
        
        // Retorna uma imagem placeholder em caso de erro
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `Erro interno: ${error.message}` })
        };
    }
};
