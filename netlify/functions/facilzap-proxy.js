const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
    
    // TENTATIVA 4: Usando o método GET no endpoint genérico.
    const API_ENDPOINT = 'https://api.facilzap.app.br/produtos';

    const responseHeaders = {
        'Content-Type': 'application/json'
    };

    if (!FACILZAP_TOKEN) {
        console.error("Erro Crítico: A variável de ambiente FACILZAP_TOKEN não foi encontrada.");
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: "Configuração do servidor incompleta. O token da API não foi definido no ambiente da Netlify." })
        };
    }

    // Opções para a requisição, agora usando GET.
    const fetchOptions = {
        method: 'GET', // <-- ÚLTIMA TENTATIVA: Mudar para GET.
        headers: {
            'Authorization': `Bearer ${FACILZAP_TOKEN}`,
            'Accept': 'application/json'
        }
    };

    try {
        const response = await fetch(API_ENDPOINT, fetchOptions);
        const responseBodyText = await response.text();

        console.log("--- INÍCIO DO DIAGNÓSTICO (Tentativa com GET em /produtos) ---");
        console.log("Endpoint Testado:", API_ENDPOINT, "Método:", fetchOptions.method);
        console.log("Status da Resposta:", response.status);
        console.log("Resposta Bruta da API:", responseBodyText);
        console.log("--- FIM DO DIAGNÓSTICO ---");

        // Se a resposta da API não for bem-sucedida...
        if (!response.ok) {
            let errorMessage = `Erro da API: ${response.statusText}`;
            try {
                // Tenta extrair uma mensagem de erro mais específica do corpo da resposta
                const errorBody = JSON.parse(responseBodyText);
                errorMessage = errorBody.message || errorBody.error || `Erro ${response.status}`;
            } catch (e) {
                // Se o corpo não for JSON, usa o texto bruto como erro
                errorMessage = responseBodyText.substring(0, 200) || `Erro ${response.status}`;
            }
            
            // Empacota a mensagem de erro no formato que o front-end espera
            return {
                statusCode: response.status,
                headers: responseHeaders,
                body: JSON.stringify({ error: errorMessage })
            };
        }

        // Se a resposta for bem-sucedida, retorna os dados.
        const data = JSON.parse(responseBodyText);
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Erro geral no proxy ao conectar com a API FacilZap:", error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: `Erro interno no proxy: ${error.message}` })
        };
    }
};
