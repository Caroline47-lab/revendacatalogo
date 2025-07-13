// Usar 'node-fetch' pode ser necessário dependendo da versão do Node na Netlify.
const fetch = require('node-fetch');

exports.handler = async (event) => {
    const url = event.queryStringParameters.url;
    
    if (!url) {
        return { statusCode: 400, body: JSON.stringify({ error: "URL não fornecida" }) };
    }

    try {
        // CORREÇÃO: Remover todas as manipulações - usar URL decodificada diretamente
        const imageUrl = decodeURIComponent(url);
        
        console.log("URL Original:", url);
        console.log("URL Decodificada para Fetch:", imageUrl);

        const response = await fetch(imageUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://facilzap.app.br/'
            }
        });

        if (!response.ok) {
            console.error(`[ERROR] Falha ao buscar imagem no proxy:`, {
                status: response.status,
                statusText: response.statusText,
                url: imageUrl
            });
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Erro ${response.status}` })
            };
        }

        const imageBuffer = await response.arrayBuffer();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': response.headers.get('content-type'),
                'Cache-Control': 'public, max-age=86400'
            },
            body: Buffer.from(imageBuffer).toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error("[ERROR] Erro fatal no proxy de imagem:", {
            errorMessage: error.message,
            requestedUrl: url
        });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
