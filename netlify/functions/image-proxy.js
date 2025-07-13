import fetch from 'node-fetch';

/**
 * Esta função atua como um proxy para as imagens da FacilZap,
 * resolvendo problemas de CORS e autenticação.
 */
export const handler = async (event) => {
    // A URL da imagem é passada como um parâmetro 'url'
    const imageUrl = event.queryStringParameters.url;
    const token = process.env.FACILZAP_TOKEN;

    if (!imageUrl) {
        return { statusCode: 400, body: 'URL da imagem não fornecida.' };
    }

    try {
        // Busca a imagem no servidor da FacilZap usando o token de autenticação
        const response = await fetch(imageUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            return { statusCode: response.status, body: response.statusText };
        }

        // Converte a imagem para um buffer
        const imageBuffer = await response.arrayBuffer();
        
        // Retorna a imagem codificada em base64, que o navegador pode exibir diretamente
        return {
            statusCode: 200,
            headers: {
                'Content-Type': response.headers.get('content-type'),
                'Cache-Control': 'public, max-age=86400' // Cache de 1 dia
            },
            body: Buffer.from(imageBuffer).toString('base64'),
            isBase64Encoded: true
        };
    } catch (error) {
        console.error("Erro no proxy de imagem:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
