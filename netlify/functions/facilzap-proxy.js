import fetch from 'node-fetch';

export const handler = async (event) => {
  const FACILZAP_TOKEN = process.env.FACILZAP_TOKEN;
  const page = event.queryStringParameters.page || '1';
  const perPage = 100;
  
  const API_ENDPOINT = `https://api.facilzap.app.br/produtos?pagina=${page}&limit=${perPage}`;

  try {
    console.log(`Fetching: ${API_ENDPOINT}`);
    const response = await fetch(API_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${FACILZAP_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: `API error: ${response.statusText}` 
        })
      };
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
