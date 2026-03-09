const EventEmitter = require('events');
const logEmitter = new EventEmitter();

function log(message, type = 'info') {
    const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        type
    };
    console.log(`[${type.toUpperCase()}] ${message}`);
    logEmitter.emit('log', logEntry);
}

module.exports = {
    log,
    logEmitter
};
