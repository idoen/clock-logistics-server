module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
    setupFiles: ["<rootDir>/tests/setupEnv.ts"],
    setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.ts"],
};
