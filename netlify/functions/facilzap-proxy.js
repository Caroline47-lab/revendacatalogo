// O Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Versão corrigida com base na análise do usuário.
 * - Usa os parâmetros de URL corretos ('page', 'length').
 * - Adiciona tratamento para erro de autenticação (401).
 */
export const handler = async (event) => {
  // Use o token real, configurado nas variáveis de ambiente da Netlify.
  const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
  
  // Lê os parâmetros da URL da requisição do front-end.
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
    // Busca detalhes de um produto específico.
    API_ENDPOINT = `https://api.facilzap.app.br/produtos/${id}`;
    console.log(`Proxy (Detalhe) buscando: ${API_ENDPOINT}`);
  } else {
    // CORREÇÃO: Usa 'page' e 'length' como a API espera.
    const pageNum = page || '1';
    const pageLength = length || '100';
    API_ENDPOINT = `https://api.facilzap.app.br/produtos?page=${pageNum}&length=${pageLength}`;
    console.log(`Proxy (Lista) buscando: ${API_ENDPOINT}`);
  }

  try {
    const response = await fetch(API_ENDPOINT, fetchOptions);

    // CORREÇÃO: Tratamento específico para erro de autenticação (token inválido).
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
    
    // Se tudo deu certo, apenas repassa a resposta da FacilZap para o front-end.
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
