const https = require('https');

exports.handler = async (event, context) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'] || event.headers['X-API-Key'];

  if (!apiKey) {
    return {
      statusCode: 401, headers: cors,
      body: JSON.stringify({ error: { message: 'API key não fornecida no header x-api-key' } })
    };
  }

  if (!event.body) {
    return {
      statusCode: 400, headers: cors,
      body: JSON.stringify({ error: { message: 'Body vazio' } })
    };
  }

  return new Promise((resolve) => {
    const payload = event.body;
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: cors,
          body: data || JSON.stringify({ error: { message: 'Resposta vazia da API' } })
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500, headers: cors,
        body: JSON.stringify({ error: { message: 'Erro de conexão: ' + err.message } })
      });
    });

    req.setTimeout(25000, () => {
      req.destroy();
      resolve({
        statusCode: 504, headers: cors,
        body: JSON.stringify({ error: { message: 'Timeout ao chamar a API' } })
      });
    });

    req.write(payload);
    req.end();
  });
};
