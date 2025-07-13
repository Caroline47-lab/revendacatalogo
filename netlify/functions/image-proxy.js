exports.handler = async (event) => {
    // Validação básica do parâmetro de URL
    const encodedUrl = event.queryStringParameters.url;
    if (!encodedUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parâmetro 'url' não fornecido" })
        };
    }

    let imageUrl;
    try {
        // Decodificação segura da URL
        imageUrl = decodeURIComponent(encodedUrl);
        
        // Validação da URL usando o construtor de URL
        new URL(imageUrl);
    } catch (error) {
        console.error("URL inválida:", { encodedUrl, error: error.message });
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "URL inválida ou malformada" })
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10s

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://facilzap.app.br/'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        // Verificação de status HTTP
        if (!response.ok) {
            console.error("Erro na origem:", {
                status: response.status,
                url: imageUrl,
                headers: Object.fromEntries(response.headers.entries())
            });
            return {
                statusCode: response.status > 400 ? response.status : 502,
                body: JSON.stringify({ 
                    error: `Falha no servidor de origem: ${response.statusText}` 
                })
            };
        }

        // Verificação do tipo de conteúdo
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            console.error("Tipo de conteúdo inválido:", contentType);
            return {
                statusCode: 415,
                body: JSON.stringify({ error: "O conteúdo solicitado não é uma imagem" })
            };
        }

        // Limitação de tamanho (4MB)
        const maxSize = 4 * 1024 * 1024;
        const contentLength = response.headers.get('content-length');
        if (contentLength && contentLength > maxSize) {
            console.error("Imagem muito grande:", contentLength);
            return {
                statusCode: 413,
                body: JSON.stringify({ error: "Arquivo excede o limite de 4MB" })
            };
        }

        const buffer = await response.arrayBuffer();
        
        // Verificação pós-download do tamanho
        if (buffer.byteLength > maxSize) {
            console.error("Tamanho real excedido:", buffer.byteLength);
            return {
                statusCode: 413,
                body: JSON.stringify({ error: "Arquivo excede o limite de 4MB" })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600'
            },
            body: Buffer.from(buffer).toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        // Tratamento específico para timeout
        if (error.name === 'AbortError') {
            console.error("Timeout na requisição:", imageUrl);
            return {
                statusCode: 504,
                body: JSON.stringify({ error: "Timeout ao acessar a imagem" })
            };
        }

        console.error("Erro crítico:", {
            url: imageUrl,
            error: error.message,
            stack: error.stack
        });
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "Erro interno do servidor",
                details: error.message
            })
        };
    }
};
