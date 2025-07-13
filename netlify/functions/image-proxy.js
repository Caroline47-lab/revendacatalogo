// Node.js 18+ já possui fetch nativo
export const handler = async (event) => {
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

    // LOG DE DEPURAÇÃO: Mostra a URL exata que está sendo buscada
    console.log("URL Original:", url);
    console.log("URL Processada:", imageUrl);
    
    const response = await fetch(imageUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://facilzap.app.br/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      },
      timeout: 10000 // 10 segundos de timeout
    });

    if (!response.ok) {
      console.error(`Falha ao buscar imagem. Status: ${response.status}`, { 
        url: imageUrl,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: `Falha ao buscar imagem. Status: ${response.status} - ${response.statusText}`, 
          url: imageUrl,
          originalUrl: url
        })
      };
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log(`Imagem carregada com sucesso. Tamanho: ${imageBuffer.byteLength} bytes, Tipo: ${contentType}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      },
      body: Buffer.from(imageBuffer).toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (error) {
    console.error("Erro no proxy de imagem:", { 
      errorMessage: error.message, 
      errorStack: error.stack,
      requestedUrl: url 
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: `Erro ao processar imagem: ${error.message}`,
        requestedUrl: url
      })
    };
  }
};
