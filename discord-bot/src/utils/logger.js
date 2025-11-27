const winston = require('winston');

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        })
    ]
});

// Add file transport if LOG_FILE is specified
if (process.env.LOG_FILE) {
    logger.add(new winston.transports.File({
        filename: process.env.LOG_FILE,
        format: logFormat
    }));
}

module.exports = logger;
