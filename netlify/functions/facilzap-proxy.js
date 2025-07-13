const fetch = require('node-fetch');

/**
 * Esta função busca uma única página de produtos da API da FacilZap.
 * Ela é chamada pelo front-end repetidamente, uma página de cada vez.
 */
exports.handler = async function(event, context) {
    const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
    // Pega o número da página dos parâmetros da URL. Se não for fornecido, assume a página 1.
    const page = event.queryStringParameters.page || '1';
    const perPage = 100; // Define o máximo de itens por página que a API permite.

    // URL corrigida com os parâmetros de paginação padronizados
    const API_ENDPOINT = `https://api.facilzap.app.br/produtos?page=${page}&per_page=${perPage}`;
    
    console.log(`Proxy buscando: ${API_ENDPOINT}`);

    const responseHeaders = {
        'Content-Type': 'application/json'
    };

    if (!FACILZAP_TOKEN) {
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: "Token da API não configurado no ambiente da Netlify." })
        };
    }

    const fetchOptions = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${FACILZAP_TOKEN}`,
            'Accept': 'application/json'
        }
    };

    try {
        const response = await fetch(API_ENDPOINT, fetchOptions);
        const responseBody = await response.text();

        console.log(`Resposta da API para página ${page}: Status ${response.status}`);

        if (!response.ok) {
            return {
                statusCode: response.status,
                headers: responseHeaders,
                body: responseBody
            };
        }

        // Retorna os dados da página solicitada com sucesso.
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: responseBody
        };

    } catch (error) {
        console.error(`Proxy: Erro de rede ao buscar a página ${page}:`, error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: `Erro interno no proxy: ${error.message}` })
        };
    }
};
