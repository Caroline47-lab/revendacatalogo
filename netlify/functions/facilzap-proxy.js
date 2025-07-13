import fetch from 'node-fetch';

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Utiliza ESM (import/export) e os parâmetros de paginação corretos.
 */
export const handler = async (event) => {
  // Token da API obtido das variáveis de ambiente da Netlify
  const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;

  // Parâmetros de paginação extraídos da requisição do front-end
  const page = event.queryStringParameters.page || '1';
  // O parâmetro correto para itens por página, conforme a documentação, é 'length'
  const length = event.queryStringParameters.length || '100';
  
  // Endpoint da API construído com os parâmetros corretos
  const API_ENDPOINT = `https://api.facilzap.app.br/produtos?page=${page}&length=${length}`;

  try {
    console.log(`Proxy buscando: ${API_ENDPOINT}`);
    const response = await fetch(API_ENDPOINT, {
      method: 'GET', // O método correto é GET
      headers: {
        'Authorization': `Bearer ${FACILZAP_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const responseBody = await response.text();

    // Se a resposta da API não for bem-sucedida, retorna o erro
    if (!response.ok) {
        console.error(`Erro da API para ${API_ENDPOINT}. Status: ${response.status}, Corpo: ${responseBody}`);
        return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: responseBody
        };
    }
    
    // Retorna os dados com sucesso, incluindo cabeçalhos para CORS
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: responseBody
    };

  } catch (error) {
    // Retorna um erro genérico caso a função falhe
    console.error("Erro no Proxy:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
