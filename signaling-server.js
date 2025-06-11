const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: ["https://www.speak5.com", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling']
});

// Store active calls and their participants
const activeCalls = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-call', (data) => {
        const { callId, userId, name, role } = data;

        // Store user info in socket
        socket.userId = userId;
        socket.callId = callId;
        socket.name = name;
        socket.role = role;

        // Join the call room
        socket.join(callId);

        // Store call information
        if (!activeCalls.has(callId)) {
            activeCalls.set(callId, new Map());
        }
        activeCalls.get(callId).set(userId, {
            socketId: socket.id,
            name: name,
            role: role
        });

        console.log(`User ${userId} (${role}) joined call ${callId}`);
    });

    socket.on('call-start-time', (data) => {
        const { callId, startTime } = data;
        // Broadcast start time to all participants in the call
        io.to(callId).emit('call-start-time', {
            callId,
            startTime,
            from: socket.userId
        });
    });

    socket.on('webrtc-offer', (data) => {
        const { to, from, offer, callId } = data;
        const targetSocket = findSocketByUserId(to, callId);
        if (targetSocket) {
            targetSocket.emit('webrtc-offer', {
                from,
                offer,
                callId
            });
        }
    });

    socket.on('webrtc-answer', (data) => {
        const { to, from, answer, callId } = data;
        const targetSocket = findSocketByUserId(to, callId);
        if (targetSocket) {
            targetSocket.emit('webrtc-answer', {
                from,
                answer,
                callId
            });
        }
    });

    socket.on('webrtc-ice-candidate', (data) => {
        const { to, from, candidate, callId } = data;
        const targetSocket = findSocketByUserId(to, callId);
        if (targetSocket) {
            targetSocket.emit('webrtc-ice-candidate', {
                from,
                candidate,
                callId
            });
        }
    });

    socket.on('chat-message', (data) => {
        const { to, from, message, callId, timestamp } = data;
        const targetSocket = findSocketByUserId(to, callId);
        if (targetSocket) {
            targetSocket.emit('chat-message', {
                from,
                message,
                callId,
                timestamp
            });
        }
    });

    socket.on('leave-call', (data) => {
        const { callId, userId } = data;
        if (activeCalls.has(callId)) {
            activeCalls.get(callId).delete(userId);
            if (activeCalls.get(callId).size === 0) {
                activeCalls.delete(callId);
            } else {
                // Notify other participants
                io.to(callId).emit('user-disconnected', {
                    userId,
                    callId
                });
            }
        }
        socket.leave(callId);
    });

    socket.on('disconnect', () => {
        if (socket.callId && socket.userId) {
            const callId = socket.callId;
            if (activeCalls.has(callId)) {
                activeCalls.get(callId).delete(socket.userId);
                if (activeCalls.get(callId).size === 0) {
                    activeCalls.delete(callId);
                } else {
                    // Notify other participants
                    io.to(callId).emit('user-disconnected', {
                        userId: socket.userId,
                        callId
                    });
                }
            }
        }
        console.log('Client disconnected:', socket.id);
    });
});

// Helper function to find socket by userId in a specific call
function findSocketByUserId(userId, callId) {
    if (activeCalls.has(callId)) {
        const userInfo = activeCalls.get(callId).get(userId);
        if (userInfo) {
            return io.sockets.sockets.get(userInfo.socketId);
        }
    }
    return null;
}

// Error handling
io.on('error', (error) => {
    console.error('Socket.IO error:', error);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
}); 
