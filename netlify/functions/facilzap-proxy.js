const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
    
    // TENTATIVA 3: Usando um endpoint genérico que pode existir, como você sugeriu.
    const API_ENDPOINT = 'https://api.facilzap.app.br/produtos';

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

    // Opções padrão para as requisições à API (usando POST, que é uma prática comum)
    const fetchOptions = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${FACILZAP_TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) 
    };

    try {
        // Faz uma única chamada ao novo endpoint /produtos
        const response = await fetch(API_ENDPOINT, fetchOptions);

        // --- LOGS DE DIAGNÓSTICO ---
        const responseBodyText = await response.text();
        console.log("--- INÍCIO DO DIAGNÓSTICO (Tentativa com /produtos) ---");
        console.log("Endpoint Testado:", API_ENDPOINT);
        console.log("Status da Resposta:", response.status);
        console.log("Resposta Bruta da API:", responseBodyText);
        console.log("--- FIM DO DIAGNÓSTICO ---");

        // Se a resposta não for bem-sucedida, repassa o erro
        if (!response.ok) {
             return {
                statusCode: response.status,
                headers: responseHeaders,
                body: responseBodyText // Retorna o erro exato da API
            };
        }

        // Processa e retorna os dados que a API enviou.
        // O seu index.html já está preparado para receber e processar isso.
        const data = JSON.parse(responseBodyText);
        
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify(data)
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
