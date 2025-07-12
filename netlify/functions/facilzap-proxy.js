const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
    
    // Endpoints da API da FacilZap que vamos consultar
    const ACTIVE_ENDPOINT = 'https://api.facilzap.app.br/listar-ativos';
    const INACTIVE_ENDPOINT = 'https://api.facilzap.app.br/listar-inativos';

    // Cabeçalhos padrão para todas as respostas
    const responseHeaders = {
        'Content-Type': 'application/json'
    };

    // Verifica se o token da API foi configurado no ambiente da Netlify
    if (!FACILZAP_TOKEN) {
        console.error("Erro Crítico: A variável de ambiente FACILZAP_TOKEN não foi encontrada.");
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: "Configuração do servidor incompleta. O token da API não foi definido no ambiente da Netlify." })
        };
    }

    // Opções padrão para as requisições à API (usando POST)
    const fetchOptions = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${FACILZAP_TOKEN}`,
            'Accept': 'application/json'
        }
    };

    try {
        // Faz as duas chamadas à API em paralelo para mais eficiência
        const [activeResponse, inactiveResponse] = await Promise.all([
            fetch(ACTIVE_ENDPOINT, fetchOptions),
            fetch(INACTIVE_ENDPOINT, fetchOptions)
        ]);

        // Processa os resultados de ambas as chamadas. Se uma falhar, retorna uma lista vazia para ela.
        const activeData = activeResponse.ok ? await activeResponse.json() : { data: [] };
        const inactiveData = inactiveResponse.ok ? await inactiveResponse.json() : { data: [] };

        // Adiciona um campo 'status' para identificar a origem de cada produto.
        // O seu index.html usará esse campo para exibir a tag correta.
        const activeProducts = (activeData.data || []).map(p => ({ ...p, status: 'ativo' }));
        const inactiveProducts = (inactiveData.data || []).map(p => ({ ...p, status: 'inativo' }));

        // Combina as duas listas em uma só
        const allProducts = [...activeProducts, ...inactiveProducts];

        // Retorna a lista unificada com sucesso
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ data: allProducts })
        };

    } catch (error) {
        // Captura erros de rede ou outros problemas na execução
        console.error("Erro ao tentar conectar com a API FacilZap:", error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: `Erro interno no proxy: ${error.message}` })
        };
    }
};
