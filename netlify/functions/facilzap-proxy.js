// A linha 'import fetch from 'node-fetch';' foi removida.
// O Node.js 18+ (definido no package.json) já possui 'fetch' de forma nativa.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Busca uma página de produtos da API.
 */
export const handler = async (event) => {
  const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
  const page = event.queryStringParameters.page || '1';
  const length = event.queryStringParameters.length || '100';
  
  const API_ENDPOINT = `https://api.facilzap.app.br/produtos?page=${page}&length=${length}`;

  try {
    console.log(`Proxy de Produtos buscando: ${API_ENDPOINT}`);
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FACILZAP_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const responseBody = await response.text();

    if (!response.ok) {
        console.error(`Erro da API para ${API_ENDPOINT}. Status: ${response.status}, Corpo: ${responseBody}`);
        return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: responseBody
        };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: responseBody
    };

  } catch (error) {
    console.error("Erro no Proxy de Produtos:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
