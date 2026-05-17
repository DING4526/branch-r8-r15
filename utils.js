const { v4: uuidv4 } = require('crypto');

/**
 * Generate a unique ID for each connection
 */
function generateId() {
  return require('crypto').randomUUID();
}

/**
 * Format current time as HH:MM:SS
 */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Create a message object
 * @param {'chat'|'system'|'userList'} type
 * @param {object} payload
 */
function createMessage(type, payload) {
  return JSON.stringify({ type, ...payload, timestamp: formatTime() });
}

module.exports = { generateId, formatTime, createMessage };
