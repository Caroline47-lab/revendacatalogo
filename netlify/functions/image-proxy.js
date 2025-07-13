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
    // CORREÇÃO: Lógica robusta para decodificar e corrigir URLs problemáticas.
    let imageUrl = decodeURIComponent(url)
      .replace(/\/\//g, '/') // Remove barras duplas
      .replace(':/', '://')   // Corrige o protocolo (ex: https:/ -> https://)
      .replace('http:/', 'http://')
      .replace('https:/', 'https://');

    // Adiciona o protocolo https:// se estiver faltando.
    if (!imageUrl.startsWith('http')) {
      imageUrl = 'https://' + imageUrl;
    }
    
    const response = await fetch(imageUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0', // Adiciona um User-Agent para evitar bloqueios.
        'Referer': 'https://facilzap.app.br/' // Adiciona um Referer para simular origem.
      }
    });

    if (!response.ok) {
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
