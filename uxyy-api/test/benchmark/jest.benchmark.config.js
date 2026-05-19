/**
 * Jest 性能测试配置
 * 用于运行基准测试和负载测试
 */
module.exports = {
  // 使用默认的 Jest 配置作为基础
  ...require('../../jest.config'),
  
  // 测试文件匹配模式
  testMatch: [
    '**/test/benchmark/**/*.spec.ts',
    '**/test/load/**/*.spec.ts',
  ],
  
  // 测试超时时间（性能测试需要更长的超时）
  testTimeout: 60000,
  
  // 并发设置
  maxWorkers: 1, // 性能测试应该串行执行，避免相互影响
  
  // 覆盖率设置（性能测试不需要覆盖率）
  collectCoverage: false,
  
  // 测试环境
  testEnvironment: 'node',
  
  // 全局设置
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  
  // 模块路径别名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/test/benchmark/setup.ts'],
  
  // 报告器
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-reports',
        outputName: 'benchmark-results.xml',
      },
    ],
  ],
  
  // 测试结果显示
  verbose: true,
  
  // 失败时停止
  bail: 0,
  
  // 缓存设置
  cache: false, // 性能测试不应该使用缓存
};
