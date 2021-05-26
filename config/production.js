module.exports = {
    loggers: {
        log4js: {
            categories: {
                default: {
                    appenders: ['console'],
                    level: process.env.LOG_LEVEL || 'info',
                },
            },
        },
    },
};
