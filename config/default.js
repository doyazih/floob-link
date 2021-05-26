module.exports = {
    loggers: {
        log4js: {
            replaceConsole: false,
            appenders: {
                console: {
                    type: 'console',
                    layout: {
                        type: 'pattern',
                        pattern: '%[[%d] [%z] [%p] - %m %]',
                        tokens: {},
                    },
                },
                file: {
                    type: 'dateFile',
                    filename: 'logs/log',
                    pattern: 'yyyy-MM-dd',
                    alwaysIncludePattern: true,
                    layout: {
                        type: 'pattern',
                        pattern: '[%d] [%z] [%p] - %m',
                        tokens: {},
                    },
                },
            },
            categories: {
                default: {
                    appenders: ['console', 'file'],
                    level: process.env.LOG_LEVEL || 'all',
                },
            },
        },
    },
};
