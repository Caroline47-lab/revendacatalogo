const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Pega o token da API que está guardado de forma segura na Netlify.
    const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
    // CORREÇÃO: Alterado o endpoint para buscar apenas produtos ativos.
    const API_ENDPOINT = 'https://api.facilzap.app.br/listar-ativos';

    // Verifica se o token foi configurado na Netlify
    if (!FACILZAP_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Token da API não configurado no ambiente da Netlify." })
        };
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${FACILZAP_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        const responseBody = await response.text();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Erro na API FacilZap: ${response.statusText}`, details: responseBody })
            };
        }
        
        // Retorna os dados com sucesso.
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: responseBody
        };

    } catch (error) {
        // Se houver um erro de rede, retorna um erro genérico.
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erro ao conectar com a API: ${error.message}` })
        };
    }
};
