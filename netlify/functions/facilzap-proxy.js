const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
    const API_ENDPOINT = 'https://api.facilzap.app.br/listar-ativos';

    // Cabeçalhos padrão para todas as respostas, garantindo que o front-end sempre receba JSON.
    const responseHeaders = {
        'Content-Type': 'application/json'
    };

    // 1. Verifica se o token da API foi configurado no ambiente da Netlify.
    if (!FACILZAP_TOKEN) {
        console.error("Erro Crítico: A variável de ambiente FACILZAP_TOKEN não foi encontrada.");
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: "Configuração do servidor incompleta. O token da API não foi definido no ambiente da Netlify." })
        };
    }

    try {
        // 2. Faz a chamada para a API real da FacilZap, usando o método POST.
        const apiResponse = await fetch(API_ENDPOINT, {
            method: 'POST', // <-- CORREÇÃO: A API exige o método POST.
            headers: {
                'Authorization': `Bearer ${FACILZAP_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        // Pega o corpo da resposta como texto para poder incluí-lo nos logs de erro se necessário.
        const responseBody = await apiResponse.text();

        // 3. Verifica se a resposta da API FacilZap foi bem-sucedida (status 2xx).
        if (!apiResponse.ok) {
            console.error(`Erro da API FacilZap: Status ${apiResponse.status}. Corpo: ${responseBody}`);
            return {
                statusCode: apiResponse.status,
                headers: responseHeaders,
                body: JSON.stringify({ 
                    error: `A API da FacilZap retornou um erro: ${apiResponse.statusText}`, 
                    details: responseBody 
                })
            };
        }
        
        // 4. Sucesso! Retorna os dados recebidos da API diretamente para o front-end.
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: responseBody 
        };

    } catch (error) {
        // 5. Captura erros de rede ou outros problemas na execução do fetch (ex: falha de conexão).
        console.error("Erro ao tentar conectar com a API FacilZap:", error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: `Erro interno no proxy: ${error.message}` })
        };
    }
};
