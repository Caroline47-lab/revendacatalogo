// Usar 'node-fetch' pode ser necessário dependendo da versão do Node na Netlify.
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
    let imageUrl = decodeURIComponent(url)
      .replace(/\/\//g, '/')
      .replace(':/', '://')
      .replace('http:/', 'http://')
      .replace('https:/', 'https://');

    if (!imageUrl.startsWith('http')) {
      imageUrl = 'https://' + imageUrl;
    }

    // LOG DE DEPURAÇÃO: Mostra a URL exata que está sendo buscada nos logs da função.
    console.log("URL Sendo Buscada:", imageUrl);
    
    const response = await fetch(imageUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://facilzap.app.br/' 
      }
    });

    if (!response.ok) {
        // Log de erro mais detalhado
        console.error(`Falha ao buscar imagem. Status: ${response.status}`, { url: imageUrl });
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: `Falha ao buscar imagem. Status: ${response.statusText}`, url: imageUrl })
        };
    }

    const imageBuffer = await response.buffer();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('content-type'),
        'Cache-Control': 'public, max-age=86400'
      },
      body: imageBuffer.toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (error) {
    console.error("Erro no proxy de imagem:", { errorMessage: error.message, requestedUrl: url });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: `Erro ao processar imagem: ${error.message}`,
        requestedUrl: url
      })
    };
  }
};
