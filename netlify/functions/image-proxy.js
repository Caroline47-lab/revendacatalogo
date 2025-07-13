exports.handler = async (event) => {
    // 1. Configurações
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    const TIMEOUT = 8000; // 8 segundos
    const ALLOWED_DOMAINS = ['.facilzap.app.br', '.lexilzap.app.br'];
    const ALLOWED_ORIGINS = [
        'https://revendacatalogo.netlify.app',
        'https://cjotarasteirinhas.com.br'
    ];

    // 2. Validar origem (CORS)
    const origin = event.headers.origin || event.headers.Origin;
    if (!ALLOWED_ORIGINS.includes(origin)) {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: "Origem não permitida" })
        };
    }

    // 3. Validar parâmetro de URL
    const encodedUrl = event.queryStringParameters.url;
    if (!encodedUrl) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: "Parâmetro 'url' ausente" })
        };
    }

    // 4. Processar URL
    let imageUrl;
    try {
        // Decodificar e normalizar
        imageUrl = decodeURIComponent(encodedUrl)
            .replace(/\s+/g, '')
            .replace(/^\/+/, '')
            .replace(/^https?:\/\/?/, 'https://');

        // Correção de URLs malformadas
        if (imageUrl.includes('://produtos/')) {
            imageUrl = imageUrl.replace('://produtos/', '://arquivos.facilzap.app.br/produtos/');
        }

        // Adicionar domínio padrão se necessário
        if (!imageUrl.startsWith('http')) {
            imageUrl = `https://arquivos.facilzap.app.br/${imageUrl}`;
        }

        // Validar URL
        const parsedUrl = new URL(imageUrl);
        
        // Verificar protocolo
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error("Protocolo inválido");
        }

        // Verificar domínio permitido
        const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
            parsedUrl.hostname.endsWith(domain)
        );
        
        if (!isAllowedDomain) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Domínio da imagem não permitido" })
            };
        }

    } catch (error) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: "URL inválida",
                message: error.message,
                encodedUrl,
                processedUrl: imageUrl || "não processada"
            })
        };
    }

    // 5. Buscar imagem
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(imageUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FacilZap-Image-Proxy/1.0)',
                'Referer': 'https://facilzap.app.br/'
            },
            redirect: 'follow'
        });
        clearTimeout(timeoutId);

        // 6. Verificar resposta
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: `Erro na origem: ${response.statusText}`,
                    url: imageUrl
                })
            };
        }

        // 7. Verificar tipo de conteúdo
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            return {
                statusCode: 415,
                body: JSON.stringify({
                    error: "Tipo de conteúdo não suportado",
                    contentType
                })
            };
        }

        // 8. Verificar tamanho
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_SIZE) {
            return {
                statusCode: 413,
                body: JSON.stringify({ error: "Imagem excede 4MB" })
            };
        }

        // 9. Obter imagem
        const arrayBuffer = await response.arrayBuffer();
        
        // Verificação pós-download
        if (arrayBuffer.byteLength > MAX_SIZE) {
            return {
                statusCode: 413,
                body: JSON.stringify({ error: "Imagem excede 4MB" })
            };
        }

        // 10. Retornar imagem
        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': origin
            },
            body: Buffer.from(arrayBuffer).toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        // 11. Tratamento de erros
        let statusCode = 500;
        let errorType = "Erro interno";

        if (error.name === 'AbortError') {
            statusCode = 504;
            errorType = "Timeout ao buscar imagem";
        }

        console.error(`[PROXY ERROR] ${errorType}: ${error.message}`, {
            url: imageUrl,
            encodedUrl
        });

        return {
            statusCode,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: errorType,
                message: error.message,
                url: imageUrl
            })
        };
    }
};
