const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

const clients = {};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log('Invalid JSON');
      return;
    }

    const { type, to, from } = data;

    switch (type) {
      case 'register':
        clients[from] = ws;
        console.log(`${from} registered`);
        break;

      case 'offer':
      case 'answer':
      case 'candidate':
        if (clients[to]) {
          clients[to].send(JSON.stringify(data));
        }
        break;

      case 'leave':
        if (clients[from]) {
          clients[from].close();
          delete clients[from];
        }
        break;
    }
  });

  ws.on('close', () => {
    for (let user in clients) {
      if (clients[user] === ws) {
        delete clients[user];
        break;
      }
    }
  });
});
