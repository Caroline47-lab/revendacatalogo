// O Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Esta versão é inteligente:
 * - Se receber um 'id', busca os detalhes de um único produto.
 * - Se buscar a lista, enriquece cada produto com um campo 'status'
 * baseado na lógica de disponibilidade (ativo/inativo e estoque).
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

          // **NOVA LÓGICA DE VERIFICAÇÃO DE STATUS**
          // 1. Verifica se o produto está explicitamente marcado como inativo.
          //    O campo `ativo` com valor `false` é um padrão comum em APIs.
          if (produto.ativo === false) {
            status = 'desativado';
          } else {
            // 2. Se o produto estiver ativo (ou o campo `ativo` não existir),
            //    aí sim verificamos o estoque para definir o status final.
            if ((produto.total_estoque || 0) > 0) {
              status = 'ativo'; // Produto disponível para venda.
            } else {
              status = 'sem_estoque'; // Produto ativo no catálogo, mas sem estoque no momento.
            }
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
