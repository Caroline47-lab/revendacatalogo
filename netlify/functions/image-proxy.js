exports.handler = async (event) => {
    // 1. Validação de origem
    const allowedOrigins = [
        'https://revendacatalogo.netlify.app',
        'https://cjotarasteirinhas.com.br'
    ];
    
    const origin = event.headers.origin || event.headers.Origin;
    if (!allowedOrigins.includes(origin)) {
        return {
            statusCode: 403,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ error: "Acesso não autorizado para este domínio" })
        };
    }

    // 2. Processamento da URL da imagem
    const encodedUrl = event.queryStringParameters.url;
    if (!encodedUrl) {
        return { statusCode: 400, body: "URL não fornecida" };
    }

    let imageUrl;
    try {
        imageUrl = decodeURIComponent(encodedUrl)
            .replace(/\s/g, '')
            .replace(/^\/\//, 'https://')
            .trim();

        // Correção automática para URLs incompletas
        if (!imageUrl.includes('://') || imageUrl.startsWith('https://produtos/')) {
            imageUrl = imageUrl.replace('https://produtos/', 'https://arquivos.facilzap.app.br/produtos/');
        }

        const parsedUrl = new URL(imageUrl);
        
        // 3. Validação de segurança
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return { statusCode: 400, body: "Protocolo inválido" };
        }
        
        if (!parsedUrl.hostname.endsWith('.facilzap.app.br')) {
            return { statusCode: 403, body: "Domínio não permitido" };
        }

        // 4. Fetch da imagem (código mantido igual)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(imageUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://facilzap.app.br/'
            }
        });
        
        clearTimeout(timeoutId);

        // ... (restante do processamento da imagem) ...

        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': origin // Permite o domínio solicitante
            },
            body: Buffer.from(buffer).toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        // ... (tratamento de erros) ...
    }
};
