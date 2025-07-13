const fetch = require('node-fetch');

exports.handler = async (event) => {
  const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
  const { page, length, id } = event.queryStringParameters;

  const fetchOptions = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${FACILZAP_TOKEN}`,
      'Accept': 'application/json'
    }
  };

  let API_ENDPOINT;

  if (id) {
    API_ENDPOINT = `https://api.facilzap.app.br/produtos/${id}`;
  } else {
    const pageNum = page || '1';
    const pageLength = length || '100';
    API_ENDPOINT = `https://api.facilzap.app.br/produtos?page=${pageNum}&length=${pageLength}`;
  }

  try {
    const response = await fetch(API_ENDPOINT, fetchOptions);

    if (response.status === 401) {
      console.error("Erro de autenticação (401). Verifique o FACILZAP_TOKEN.");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Token de autenticação inválido ou expirado." })
      };
    }

    const responseBody = await response.text();

    if (!response.ok) {
      console.error(`Erro da API para ${API_ENDPOINT}. Status: ${response.status}`);
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
    console.error("Erro fatal no Proxy:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
