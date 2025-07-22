exports.handler = async (event) => {
    // 1. Validar parâmetro
    const productId = event.queryStringParameters.productId;
    if (!productId) return { statusCode: 400, body: "ID do produto ausente" };

    try {
        // 2. Obter URLs das imagens do produto (substitua por sua lógica real)
        const imageUrls = await getProductImageUrls(productId);

        // 3. Processar todas as imagens em paralelo
        const imagesData = await Promise.all(
            imageUrls.map(async (rawUrl) => {
                // Aplicar correções de URL
                let imageUrl = rawUrl
                    .replace(/%3A(\d+)F/g, '%3A%$1F')
                    .replace('://produtos/', '://arquivos.facilzap.app.br/produtos/');

                // Forçar domínio correto se faltante
                if (!imageUrl.includes('://')) {
                    imageUrl = `https://arquivos.facilzap.app.br/${imageUrl.replace(/^\//, '')}`;
                }

                // Validar domínio
                const parsedUrl = new URL(imageUrl);
                if (!parsedUrl.hostname.endsWith('.facilzap.app.br')) {
                    throw new Error("Domínio bloqueado");
                }

                // Buscar imagem
                const response = await fetch(imageUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                return {
                    url: imageUrl,
                    contentType: response.headers.get('content-type'),
                    data: Buffer.from(await response.arrayBuffer()).toString('base64')
                };
            })
        );

        // 4. Retornar todas as imagens
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://cjotarasteirinhas.com.br'
            },
            body: JSON.stringify(imagesData),
            isBase64Encoded: false
        };

    } catch (error) {
        return {
            statusCode: error.message === "Domínio bloqueado" ? 403 : 500,
            body: JSON.stringify({
                error: error.message,
                productId: productId
            })
        };
    }
};

// ==============================================
// FUNÇÃO QUE VOCÊ DEVE IMPLEMENTAR CONFORME SUA FONTE DE DADOS
// ==============================================
async function getProductImageUrls(productId) {
    // Exemplo 1: Padrão de nomes (substitua pelo seu padrão real)
    return [
        `https://facilzap.app.br/produtos/${productId}/imagem1.jpg`,
        `https://facilzap.app.br/produtos/${productId}/imagem2.jpg`,
        `https://facilzap.app.br/produtos/${productId}/imagem3.jpg`
    ];

    // Exemplo 2: Buscar de banco de dados ou API
    // const response = await fetch(`https://sua-api.com/produtos/${productId}/imagens`);
    // const data = await response.json();
    // return data.images;
}
