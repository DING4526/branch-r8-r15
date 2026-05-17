const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

let db = loadUsers();

function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { users: {}, tokens: {} };
  }
}

function saveUsers() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomUUID();
}

function register(username, password) {
  if (!username || !username.trim()) {
    return { success: false, error: 'Username cannot be empty' };
  }
  if (!password || !password.trim()) {
    return { success: false, error: 'Password cannot be empty' };
  }

  username = username.trim();

  // Check uniqueness
  for (const user of Object.values(db.users)) {
    if (user.username === username) {
      return { success: false, error: 'Username already exists' };
    }
  }

  const userId = crypto.randomUUID();
  const token = generateToken();

  db.users[userId] = {
    id: userId,
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  db.tokens[token] = {
    userId,
    createdAt: new Date().toISOString(),
  };

  saveUsers();
  return { success: true, token, userId, username };
}

function login(username, password) {
  if (!username || !username.trim()) {
    return { success: false, error: 'Username cannot be empty' };
  }
  if (!password || !password.trim()) {
    return { success: false, error: 'Password cannot be empty' };
  }

  username = username.trim();
  const hash = hashPassword(password);

  for (const user of Object.values(db.users)) {
    if (user.username === username && user.passwordHash === hash) {
      const token = generateToken();
      db.tokens[token] = {
        userId: user.id,
        createdAt: new Date().toISOString(),
      };
      saveUsers();
      return { success: true, token, userId: user.id, username: user.username };
    }
  }

  return { success: false, error: 'Invalid username or password' };
}

function verifyToken(token) {
  if (!token) return null;
  const entry = db.tokens[token];
  if (!entry) return null;
  const user = db.users[entry.userId];
  if (!user) return null;
  return { id: user.id, username: user.username };
}

function logout(token) {
  if (token && db.tokens[token]) {
    delete db.tokens[token];
    saveUsers();
  }
}

module.exports = { register, login, verifyToken, logout };
