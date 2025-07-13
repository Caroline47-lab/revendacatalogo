// O Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Esta função atua como um proxy para as imagens da FacilZap.
 * Ela recebe o caminho da imagem, busca no servidor da FacilZap usando o token
 * e a retorna para o navegador.
 */
export const handler = async (event) => {
    // Extrai o caminho da imagem do parâmetro 'url'
    const imagePath = event.queryStringParameters.url;
    const token = process.env.FACILZAP_TOKEN;

    if (!imagePath) {
        return { statusCode: 400, body: 'Caminho da imagem não fornecido.' };
    }

    // Monta a URL completa para buscar a imagem no servidor de origem
    const imageUrl = `https://api.facilzap.app.br/${decodeURIComponent(imagePath)}`;

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
