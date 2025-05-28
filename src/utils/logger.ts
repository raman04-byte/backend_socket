// More strict check for debug mode
const debugEnabled = process.env.DEBUG_LOGS?.toLowerCase() === 'true';

// Add startup message
console.log('🔧 Logger Configuration:', {
    debugMode: debugEnabled ? 'Enabled' : 'Disabled',
    DEBUG_LOGS: process.env.DEBUG_LOGS,
    parsed: process.env.DEBUG_LOGS?.toLowerCase() === 'true'
});

export const logger = {
    debug: (...args: any[]) => {
        if (process.env.DEBUG_LOGS?.toLowerCase() === 'true') {
            console.log('🔍 DEBUG:', ...args);
        }
    },
    info: (...args: any[]) => {
        console.info('ℹ️ INFO:', ...args);
    },
    warn: (...args: any[]) => {
        console.warn('⚠️ WARN:', ...args);
    },
    error: (...args: any[]) => {
        console.error('❌ ERROR:', ...args);
    }
};
