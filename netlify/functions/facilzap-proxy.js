// O Node.js 18+ já possui 'fetch' de forma nativa, então o import não é necessário.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Esta versão é inteligente: se receber um 'id', busca os detalhes de um
 * único produto. Caso contrário, busca a lista paginada de produtos.
 */
export const handler = async (event) => {
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

  // Roteamento da requisição baseado nos parâmetros recebidos
  if (id) {
    // Se um ID foi fornecido, busca os detalhes do produto específico.
    API_ENDPOINT = `https://api.facilzap.app.br/produtos/${id}`;
    console.log(`Proxy (Detalhe) buscando: ${API_ENDPOINT}`);
  } else {
    // Caso contrário, busca a lista paginada de produtos.
    const pageNum = page || '1';
    const pageLength = length || '100';
    API_ENDPOINT = `https://api.facilzap.app.br/produtos?page=${pageNum}&length=${pageLength}`;
    console.log(`Proxy (Lista) buscando: ${API_ENDPOINT}`);
  }

  try {
    const response = await fetch(API_ENDPOINT, fetchOptions);
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
    console.error("Erro no Proxy:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
