const EventEmitter = require('events');
const logEmitter = new EventEmitter();

// ANSI Color Codes
const colors = {
    reset: "\x1b[0m",
    info: "\x1b[34m",    // Blue
    success: "\x1b[32m", // Green
    warn: "\x1b[33m",    // Yellow
    error: "\x1b[31m"    // Red
};

function log(message, type = 'info') {
    const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        type
    };
    
    const color = colors[type] || colors.reset;
    console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${message}`);
    logEmitter.emit('log', logEntry);
}

module.exports = {
    log,
    logEmitter
};
