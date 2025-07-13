import fetch from 'node-fetch';

/**
 * Esta função atua como um proxy para as imagens da FacilZap.
 * Ela recebe o caminho da imagem, busca no servidor da FacilZap usando o token
 * de autenticação e a retorna para o navegador.
 * Isso resolve problemas de CORS e de autenticação para acessar as imagens.
 */
export const handler = async (event) => {
    // O caminho da imagem é passado como um parâmetro 'url' pelo netlify.toml
    const imagePath = event.queryStringParameters.url;
    const token = process.env.FACILZAP_TOKEN;

    if (!imagePath) {
        return { statusCode: 400, body: 'Caminho da imagem não fornecido.' };
    }

    // A URL completa da imagem no servidor da FacilZap
    const imageUrl = `https://api.facilzap.app.br/${imagePath}`;

    try {
        const response = await fetch(imageUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            return { statusCode: response.status, body: response.statusText };
        }

        // Converte a imagem para um buffer para poder codificá-la
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
