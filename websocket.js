const { WebSocketServer } = require('ws');
const { createMessage } = require('./utils');

// Map<ws, { userId, username, token }>
const clients = new Map();

let auth; // injected from index.js

function setupWebSocket(server, authModule) {
  auth = authModule;
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // Extract token from query string
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const user = auth.verifyToken(token);

    if (!user) {
      ws.send(createMessage('auth_error', { error: 'Invalid token' }));
      ws.close();
      return;
    }

    // Check for duplicate connection from same user
    let isReconnect = false;
    for (const [oldWs, oldClient] of clients) {
      if (oldClient.userId === user.id) {
        isReconnect = true;
        // Close old connection silently
        clients.delete(oldWs);
        oldWs.send(createMessage('system', {
          content: 'Connected from another location',
        }));
        oldWs.close();
        break;
      }
    }

    // Register new connection
    clients.set(ws, { userId: user.id, username: user.username, token });

    // Only broadcast join if this is a genuinely new arrival
    if (!isReconnect) {
      broadcast(createMessage('system', {
        content: `${user.username} joined the chatroom`,
      }));
    }

    // Always broadcast updated user list
    broadcastUserList();

    ws.on('message', (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      switch (data.type) {
        case 'chat':
          handleChat(ws, data.content);
          break;
        case 'logout':
          handleLogout(ws);
          break;
      }
    });

    ws.on('close', () => {
      handleLeave(ws);
    });
  });

  return wss;
}

function handleChat(ws, content) {
  const client = clients.get(ws);
  if (!client) return;

  if (!content || !content.trim()) return;

  broadcast(createMessage('chat', {
    userId: client.userId,
    nickname: client.username,
    content: content.trim(),
  }));
}

function handleLogout(ws) {
  const client = clients.get(ws);
  if (!client) return;

  // Invalidate token
  auth.logout(client.token);

  // Remove from clients and broadcast departure
  clients.delete(ws);
  broadcast(createMessage('system', {
    content: `${client.username} left the chatroom`,
  }));
  broadcastUserList();

  ws.close();
}

function handleLeave(ws) {
  const client = clients.get(ws);
  if (!client) return; // already removed (logout or duplicate handling)

  clients.delete(ws);
  broadcast(createMessage('system', {
    content: `${client.username} left the chatroom`,
  }));
  broadcastUserList();
}

function broadcast(message) {
  for (const [ws] of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

function broadcastUserList() {
  const users = [];
  for (const [, client] of clients) {
    users.push({ userId: client.userId, username: client.username });
  }
  broadcast(createMessage('userList', { users }));
}

module.exports = { setupWebSocket };
