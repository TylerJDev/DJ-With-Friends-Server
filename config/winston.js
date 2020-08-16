var winston = require('winston');

// define the custom settings for each transport (file, console)
var options = {
  file: {
    level: 'info',
    filename: `./logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

// instantiate a new Winston Logger with the settings defined above
var logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.printf(info => `{"message": "${info.message}", "level": "${info.level}", "timestamp": "${info.timestamp}"}`)
    ),
    transports: [
        new winston.transports.File(options.file),
        new winston.transports.Console(options.console)
    ],
  exitOnError: false, // do not exit on handled exceptions
});

module.exports = logger;