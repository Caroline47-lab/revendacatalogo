// O Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Esta versão é inteligente:
 * - Se buscar a lista, enriquece cada produto com um campo 'status'.
 * - Se buscar detalhes de um 'id', processa o estoque das variações.
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

  if (id) {
    API_ENDPOINT = `https://api.facilzap.app.br/produtos/${id}`;
    console.log(`Proxy (Detalhe) buscando: ${API_ENDPOINT}`);
  } else {
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
    
    let finalBody = responseBody;

    if (id) {
      // **NOVA LÓGICA PARA DETALHES DO PRODUTO**
      // Garante que o estoque de cada variação seja numérico.
      const data = JSON.parse(responseBody);
      const productDetails = data.data || data;

      if (productDetails && Array.isArray(productDetails.estoque)) {
        productDetails.estoque = productDetails.estoque.map(variacao => {
          return {
            ...variacao,
            estoque: parseFloat(variacao.estoque) || 0
          };
        });
      }
      
      if (data.data) {
        data.data = productDetails;
        finalBody = JSON.stringify(data);
      } else {
        finalBody = JSON.stringify(productDetails);
      }

    } else {
      // **LÓGICA PARA A LISTA DE PRODUTOS**
      const data = JSON.parse(responseBody);
      if (data && Array.isArray(data.data)) {
        const produtosEnriquecidos = data.data.map(produto => {
          const estoqueNumerico = parseFloat(produto.total_estoque) || 0;
          const status = estoqueNumerico > 0 ? 'ativo' : 'sem_estoque';
          return { ...produto, status: status };
        });
        data.data = produtosEnriquecidos;
        finalBody = JSON.stringify(data);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: finalBody
    };

  } catch (error) {
    console.error("Erro no Proxy:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
