const express = require('express');
const http = require('http');
const path = require('path');
const auth = require('./auth');
const { setupWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);

// Parse JSON request bodies
app.use(express.json());

// Serve static files from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Auth REST API ──

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const result = auth.register(username, password);
  res.json(result);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const result = auth.login(username, password);
  res.json(result);
});

app.post('/api/verify', (req, res) => {
  const { token } = req.body;
  const user = auth.verifyToken(token);
  if (user) {
    res.json({ success: true, userId: user.id, username: user.username });
  } else {
    res.json({ success: false });
  }
});

// Setup WebSocket with auth
setupWebSocket(server, auth);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chatroom server running at http://localhost:${PORT}`);
});
