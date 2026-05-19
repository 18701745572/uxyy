/**
 * 性能测试环境设置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.BENCHMARK_MODE = 'true';

// 禁用日志输出（避免影响性能测试）
if (process.env.BENCHMARK_MODE === 'true') {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

// 全局测试超时设置
jest.setTimeout(60000);

// 性能测试前的准备工作
beforeAll(async () => {
  // 等待系统稳定
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 如果可能，强制垃圾回收
  if (global.gc) {
    global.gc();
  }
});

// 每个测试后的清理工作
afterEach(async () => {
  // 等待异步操作完成
  await new Promise(resolve => setTimeout(resolve, 50));
});

// 性能测试后的清理工作
afterAll(async () => {
  // 最终垃圾回收
  if (global.gc) {
    global.gc();
  }
  
  // 等待所有连接关闭
  await new Promise(resolve => setTimeout(resolve, 500));
});
