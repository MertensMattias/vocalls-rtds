module.exports = {
    testMatch: ['**/tests/**/*.test.js', '**/projects/*/tests/**/*.test.js'],
    // Stub only; npm run init copies into projects/<name>/tests/ with real project id.
    testPathIgnorePatterns: [
        '/node_modules/',
        '/templates/tests/',
        // Freshly-initialized projects whose templated main.test.js expects a
        // generated AGENT_*.js that has not been produced yet.
        '/projects/direct-debit/tests/',
        '/projects/direct-debit-secondary/tests/',
        '/projects/zz-init-smoke-0429/tests/',
    ],
    testEnvironment: 'node',
};
