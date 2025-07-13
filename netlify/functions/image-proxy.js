exports.handler = async (event) => {
    // Validação robusta do parâmetro de URL
    const encodedUrl = event.queryStringParameters.url;
    if (!encodedUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parâmetro 'url' não fornecido" })
        };
    }

    let imageUrl;
    try {
        // Decodificação segura + normalização de URL
        imageUrl = decodeURIComponent(encodedUrl)
            .replace(/\s/g, '')
            .replace(/^\/\//, 'https://')
            .trim();
        
        // Validação rigorosa da URL
        const parsedUrl = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Protocolo não permitido" })
            };
        }
        
        // CORREÇÃO: DOMÍNIOS PERMITIDOS ATUALIZADOS
        const allowedDomains = [
            '.lexilzap.app.br',
            '.facilzap.app.br' // DOMÍNIO ADICIONADO
        ];
        
        if (!allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain))) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Domínio não autorizado" })
            };
        }
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ 
                error: "URL inválida",
                details: error.message,
                receivedUrl: encodedUrl,
                processedUrl: imageUrl || 'não processada'
            })
        };
    }

    // ... (restante do código permanece igual) ...
    // O fetch e processamento da imagem continuam idênticos
};
