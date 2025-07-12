const fetch = require('node-fetch');

// Função para buscar uma única página de produtos
async function fetchProductPage(page, token) {
    // O parâmetro de página é adicionado à URL
    const API_ENDPOINT = `https://api.facilzap.app.br/produtos?pagina=${page}`;
    
    const fetchOptions = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    };

    console.log(`Buscando página ${page}...`);
    const response = await fetch(API_ENDPOINT, fetchOptions);

    if (!response.ok) {
        console.error(`Erro ao buscar página ${page}. Status: ${response.status}`);
        // Se uma página falhar, retornamos uma lista vazia para não quebrar o processo.
        return []; 
    }

    const data = await response.json();
    // A API da FacilZap aninha os dados dentro de um objeto 'data'.
    return data.data || [];
}


exports.handler = async function(event, context) {
    const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
    
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

    try {
        let currentPage = 1;
        let allProducts = [];
        let keepFetching = true;

        console.log("--- INICIANDO SINCRONIZAÇÃO COMPLETA ---");

        // O loop continua enquanto a API retornar produtos na página anterior.
        while (keepFetching) {
            const productsFromPage = await fetchProductPage(currentPage, FACILZAP_TOKEN);

            if (productsFromPage.length > 0) {
                allProducts = allProducts.concat(productsFromPage);
                console.log(`Página ${currentPage} carregada com ${productsFromPage.length} produtos. Total acumulado: ${allProducts.length}`);
                currentPage++;
            } else {
                // Se a API retorna uma página vazia, significa que chegamos ao fim.
                console.log(`Página ${currentPage} vazia. Finalizando busca.`);
                keepFetching = false;
            }
        }

        console.log(`--- SINCRONIZAÇÃO FINALIZADA. TOTAL DE PRODUTOS: ${allProducts.length} ---`);

        return {
            statusCode: 200,
            headers: responseHeaders,
            // Retorna a lista completa de produtos dentro de um objeto 'data',
            // mantendo a consistência com a resposta original da API.
            body: JSON.stringify({ data: allProducts })
        };

    } catch (error) {
        console.error("Erro geral no proxy durante a paginação:", error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: `Erro interno no proxy: ${error.message}` })
        };
    }
};
