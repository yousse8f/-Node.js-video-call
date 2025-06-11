const http = require('http');
const WebSocket = require('ws');

// إنشاء سيرفر HTTP علشان Railway ويدعم WebSocket بنفس البورت
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket server is running.');
});

// ربط WebSocket بالسيرفر HTTP
const wss = new WebSocket.Server({ server });

// تخزين العملاء
const clients = {};

wss.on('connection', (ws) => {
  let clientId = null;

  ws.on('message', (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log('Invalid JSON:', message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    const { type, to, from } = data;

    switch (type) {
      case 'register':
        clientId = from;
        clients[from] = ws;
        console.log(`${from} registered`);
        ws.send(JSON.stringify({ type: 'registered', from }));
        break;

      case 'offer':
      case 'answer':
      case 'candidate':
        if (clients[to]) {
          clients[to].send(JSON.stringify(data));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: `User ${to} not found` }));
        }
        break;

      case 'leave':
        if (clients[from]) {
          clients[from].close();
          delete clients[from];
          clientId = null;
        }
        break;
    }
  });

  ws.on('close', () => {
    if (clientId && clients[clientId]) {
      console.log(`${clientId} disconnected`);
      delete clients[clientId];
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (clientId && clients[clientId]) {
      delete clients[clientId];
    }
  });
});

// تشغيل السيرفر على البورت الصحيح
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
