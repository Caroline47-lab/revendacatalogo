// O Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Esta função atua como um proxy para as imagens da FacilZap.
 * Ela recebe a URL COMPLETA da imagem, busca no servidor da FacilZap
 * usando o token de autenticação e a retorna para o navegador.
 */
export const handler = async (event) => {
    // A URL completa da imagem é passada como um parâmetro 'url'
    const imageUrl = event.queryStringParameters.url;
    const token = process.env.FACILZAP_TOKEN;

    if (!imageUrl) {
        return { statusCode: 400, body: 'URL da imagem não fornecida.' };
    }

    console.log(`Proxy de Imagem buscando: ${imageUrl}`);

    try {
        const response = await fetch(imageUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error(`Falha ao buscar imagem: ${imageUrl}, Status: ${response.status}`);
            return { statusCode: response.status, body: response.statusText };
        }

        const imageBuffer = await response.arrayBuffer();
        
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
