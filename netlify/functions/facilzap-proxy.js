// Node.js 18+ já possui 'fetch' de forma nativa.

/**
 * Handler da função Netlify para atuar como proxy para a API FacilZap.
 * Versão melhorada com logs detalhados e tratamento robusto de dados.
 */
export const handler = async (event) => {
  const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
  
  if (!FACILZAP_TOKEN) {
    console.error("FACILZAP_TOKEN não está configurado nas variáveis de ambiente");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Token de configuração não encontrado" })
    };
  }
  
  const { page, length, id } = event.queryStringParameters || {};

  const fetchOptions = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${FACILZAP_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };

  let API_ENDPOINT;

  if (id) {
    API_ENDPOINT = `https://api.facilzap.app.br/produtos/${id}`;
    console.log(`Proxy (Detalhe) buscando produto ID: ${id}`);
  } else {
    const pageNum = page || '1';
    const pageLength = length || '100';
    API_ENDPOINT = `https://api.facilzap.app.br/produtos?page=${pageNum}&length=${pageLength}`;
    console.log(`Proxy (Lista) buscando página: ${pageNum}, tamanho: ${pageLength}`);
  }

  try {
    const response = await fetch(API_ENDPOINT, fetchOptions);
    
    console.log(`Resposta da API FacilZap - Status: ${response.status}`);

    if (response.status === 401) {
      console.error("Erro de autenticação (401). Token inválido ou expirado.");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Token de autenticação inválido ou expirado." })
      };
    }

    const responseBody = await response.text();
    
    if (!response.ok) {
      console.error(`Erro da API FacilZap:`, {
        endpoint: API_ENDPOINT,
        status: response.status,
        statusText: response.statusText,
        body: responseBody.substring(0, 500) // Primeiros 500 caracteres para debug
      });
      
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: responseBody
      };
    }

    // Log detalhado do que estamos recebendo
    try {
      const jsonData = JSON.parse(responseBody);
      console.log(`Dados recebidos da API:`, {
        totalItems: jsonData.data ? jsonData.data.length : 'N/A',
        firstItem: jsonData.data && jsonData.data[0] ? {
          id: jsonData.data[0].id,
          nome: jsonData.data[0].nome,
          imagem: jsonData.data[0].imagem,
          estoque: typeof jsonData.data[0].estoque,
          estoqueLength: Array.isArray(jsonData.data[0].estoque) ? jsonData.data[0].estoque.length : 'N/A'
        } : 'Sem dados'
      });
    } catch (parseError) {
      console.log("Resposta não é JSON válido ou estrutura diferente");
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
    console.error("Erro fatal no Proxy:", {
      message: error.message,
      stack: error.stack,
      endpoint: API_ENDPOINT
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: `Erro no proxy: ${error.message}`,
        endpoint: API_ENDPOINT
      })
    };
  }
};
