// O Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Esta versão é inteligente:
 * - Se receber um 'id', busca os detalhes de um único produto.
 * - Se buscar a lista, enriquece cada produto com um campo 'status'
 * para facilitar a lógica no front-end.
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
    
    // --- INÍCIO DA NOVA LÓGICA ---
    // Se a requisição foi para a lista de produtos (sem 'id'),
    // vamos modificar o corpo da resposta para adicionar o status.
    let finalBody = responseBody;

    if (!id) {
      const data = JSON.parse(responseBody);
      
      // Verifica se a resposta tem o formato esperado com a propriedade 'data'
      if (data && Array.isArray(data.data)) {
        
        // Mapeia os produtos para adicionar o novo campo 'status'
        const produtosEnriquecidos = data.data.map(produto => {
          let status;
          const situacaoFromApi = produto.situacao ? produto.situacao.toLowerCase() : '';
          
          if (situacaoFromApi === 'desativado') {
            status = 'desativado';
          } else if ((produto.total_estoque || 0) > 0) {
            status = 'ativo';
          } else {
            status = 'sem_estoque';
          }

          // Retorna o produto original com o novo campo 'status'
          return { ...produto, status: status };
        });

        // Substitui a lista de produtos original pela nova lista enriquecida
        data.data = produtosEnriquecidos;
        
        // Converte o objeto modificado de volta para uma string JSON
        finalBody = JSON.stringify(data);
      }
    }
    // --- FIM DA NOVA LÓGICA ---

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Permite que seu front-end acesse a API
      },
      body: finalBody // Retorna o corpo da resposta, modificado ou não
    };

  } catch (error) {
    console.error("Erro no Proxy:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
