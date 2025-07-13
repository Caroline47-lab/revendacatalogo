// Usar 'node-fetch' pode ser necessário dependendo da versão do Node na Netlify.
// Se estiver usando Node 18+, o fetch nativo pode ser usado.
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const url = event.queryStringParameters.url;
  
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "URL da imagem não fornecida" })
    };
  }

  try {
    // Decodifica a URL para garantir que caracteres especiais sejam tratados corretamente.
    const decodedUrl = decodeURIComponent(url);
    
    const response = await fetch(decodedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' } // Adiciona um User-Agent para evitar bloqueios.
    });

    if (!response.ok) {
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: `Falha ao buscar imagem. Status: ${response.statusText}` })
        };
    }

    const imageBuffer = await response.buffer();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('content-type'),
        'Cache-Control': 'public, max-age=86400' // Adiciona cache para otimizar.
      },
      body: imageBuffer.toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (error) {
    console.error("Erro no proxy de imagem:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: `Erro ao processar imagem: ${error.message}`,
        requestedUrl: url
      })
    };
  }
};
