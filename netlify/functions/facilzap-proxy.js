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
            'Accept': 'application/json',
            'Content-Type': 'application/json' // Adicionado por boa prática
        },
        // AJUSTE DE DEBUG: Algumas APIs exigem um corpo, mesmo que vazio, para requisições POST.
        body: JSON.stringify({}) 
    };

    try {
        // Faz as duas chamadas à API em paralelo para mais eficiência
        const [activeResponse, inactiveResponse] = await Promise.all([
            fetch(ACTIVE_ENDPOINT, fetchOptions),
            fetch(INACTIVE_ENDPOINT, fetchOptions)
        ]);

        // --- LOGS DE DIAGNÓSTICO ---
        // Pega a resposta bruta como texto para podermos ver exatamente o que a API retornou.
        const activeBodyText = await activeResponse.text();
        const inactiveBodyText = await inactiveResponse.text();
        
        console.log("--- INÍCIO DO DIAGNÓSTICO FACILZAP ---");
        console.log("Status da Resposta (Ativos):", activeResponse.status);
        console.log("Resposta Bruta da API (Ativos):", activeBodyText);
        console.log("Status da Resposta (Inativos):", inactiveResponse.status);
        console.log("Resposta Bruta da API (Inativos):", inactiveBodyText);
        console.log("--- FIM DO DIAGNÓSTICO FACILZAP ---");

        // Processa os resultados. Agora usamos o texto que já lemos.
        const activeData = activeResponse.ok ? JSON.parse(activeBodyText) : { data: [] };
        const inactiveData = inactiveResponse.ok ? JSON.parse(inactiveBodyText) : { data: [] };

        // Adiciona um campo 'status' para identificar a origem de cada produto.
        const activeProducts = (activeData.data || []).map(p => ({ ...p, status: 'ativo' }));
        const inactiveProducts = (inactiveData.data || []).map(p => ({ ...p, status: 'inativo' }));

        // Combina as duas listas em uma só
        const allProducts = [...activeProducts, ...inactiveProducts];
        
        console.log(`Total de produtos combinados: ${allProducts.length}`);

        // Retorna a lista unificada com sucesso
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ data: allProducts })
        };

    } catch (error) {
        // Captura erros de rede ou outros problemas na execução
        console.error("Erro geral no proxy ao conectar com a API FacilZap:", error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: `Erro interno no proxy: ${error.message}` })
        };
    }
};
