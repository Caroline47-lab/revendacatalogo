const fetch = require('node-fetch');
const sharp = require('sharp');

exports.handler = async (event) => {
    // 1. Validar parâmetros da query
    const { url: encodedUrl, w, q, format } = event.queryStringParameters;
    if (!encodedUrl) {
        return { statusCode: 400, body: "Parâmetro 'url' da imagem ausente." };
    }

    // 2. Decodificar e validar a URL da imagem
    let imageUrl;
    try {
        imageUrl = decodeURIComponent(encodedUrl);
        // Garante que o domínio é o permitido
        if (!new URL(imageUrl).hostname.endsWith('.facilzap.app.br')) {
            return { statusCode: 403, body: "Domínio de imagem não permitido." };
        }
    } catch (error) {
        return { statusCode: 400, body: "URL da imagem inválida." };
    }

    try {
        // 3. Buscar a imagem original
        const response = await fetch(imageUrl);
        if (!response.ok) {
            return { statusCode: response.status, body: response.statusText };
        }
        const imageBuffer = await response.buffer();

        // 4. Otimizar a imagem com Sharp
        const width = w ? parseInt(w, 10) : null; // Largura desejada
        const quality = q ? parseInt(q, 10) : 75; // Qualidade (padrão 75)
        const outputFormat = format || 'webp'; // Formato (padrão webp)

        let transformer = sharp(imageBuffer);

        if (width) {
            transformer = transformer.resize({ width });
        }

        transformer = transformer[outputFormat]({ quality });

        const optimizedImageBuffer = await transformer.toBuffer();

        // 5. Retornar a imagem otimizada
        return {
            statusCode: 200,
            headers: {
                'Content-Type': `image/${outputFormat}`,
                'Cache-Control': 'public, max-age=31536000' // Cache de 1 ano no navegador
            },
            body: optimizedImageBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error("Erro no processamento da imagem:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Falha ao otimizar a imagem." })
        };
    }
};
