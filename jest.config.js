module.exports = {
    testMatch: ['**/projects/*/tests/**/*.test.js'],
    // .claude holds agent-managed git worktrees (.claude/worktrees/<branch>);
    // their tests belong to their own branch checkout, not this one.
    testPathIgnorePatterns: ['/node_modules/', '/templates/tests/', '[/\\\\]\\.claude[/\\\\]'],
    testEnvironment: 'node',
};
