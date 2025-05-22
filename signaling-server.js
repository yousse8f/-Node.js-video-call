
const WebSocket = require('ws');

// إنشاء السيرفر بدون منفذ افتراضي لضمان التوافق مع Railway
const wss = new WebSocket.Server({ port: process.env.PORT });

// تخزين العملاء مع معرفهم
const clients = {};

wss.on('connection', (ws) => {
  // تخزين معرف العميل مؤقتًا
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
        clientId = from; // حفظ معرف العميل
        clients[from] = ws;
        console.log(`${from} registered`);
        // إرسال رد تأكيد للعميل
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

// تسجيل حالة السيرفر
console.log(`WebSocket server running on port ${process.env.PORT}`);
