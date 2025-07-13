// O Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Esta versão é inteligente:
 * - Se receber um 'id', busca os detalhes de um único produto.
 * - Se buscar a lista, enriquece cada produto com um campo 'status'
 * baseado na contagem de estoque, tratando o dado corretamente.
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

    // Se a requisição foi para a lista de produtos, enriquece os dados.
    if (!id) {
      const data = JSON.parse(responseBody);
      
      if (data && Array.isArray(data.data)) {
        
        const produtosEnriquecidos = data.data.map(produto => {
          let status;

          // --- LÓGICA CORRIGIDA E DEFINITIVA ---
          // 1. Converte o campo 'total_estoque' (que é uma string) para um número.
          //    Usa parseFloat para lidar com casas decimais, se houver.
          const estoqueNumerico = parseFloat(produto.total_estoque) || 0;

          // 2. Compara o valor numérico para definir o status.
          if (estoqueNumerico > 0) {
            status = 'ativo';
          } else {
            status = 'sem_estoque';
          }

          // Retorna o produto original com o novo campo 'status'
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
