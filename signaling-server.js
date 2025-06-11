const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// إعدادات CORS
const io = new Server(server, {
  cors: {
    origin: 'https://www.speak5.com', // موقعك
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// معالجة الاتصالات
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (data) => {
    console.log(`${data.from} registered`);
    socket.emit('registered', { from: data.from });
  });

  socket.on('offer', (data) => {
    io.to(data.to).emit('offer', data);
  });

  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', data);
  });

  socket.on('candidate', (data) => {
    io.to(data.to).emit('candidate', data);
  });

  socket.on('leave', (data) => {
    console.log(`${data.from} left`);
    socket.disconnect(true);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
