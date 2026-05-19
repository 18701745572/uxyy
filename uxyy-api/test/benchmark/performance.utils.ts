/**
 * 性能测试工具函数
 * 提供基准测试、性能监控和报告生成功能
 */

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  opsPerSecond: number;
}

export interface LoadTestResult {
  name: string;
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalTime: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
}

/**
 * 运行基准测试
 * @param name 测试名称
 * @param fn 测试函数
 * @param iterations 迭代次数
 * @returns 测试结果
 */
export async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 1000,
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // 预热
  for (let i = 0; i < Math.min(10, iterations * 0.1); i++) {
    await fn();
  }

  // 正式测试
  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    const iterationStart = Date.now();
    await fn();
    times.push(Date.now() - iterationStart);
  }
  const totalTime = Date.now() - startTime;

  // 计算统计数据
  const sortedTimes = [...times].sort((a, b) => a - b);
  const avgTime = totalTime / iterations;
  const minTime = sortedTimes[0];
  const maxTime = sortedTimes[sortedTimes.length - 1];
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
  const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99Time = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  const opsPerSecond = 1000 / avgTime;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    medianTime,
    p95Time,
    p99Time,
    opsPerSecond,
  };
}

/**
 * 运行并发负载测试
 * @param name 测试名称
 * @param fn 测试函数
 * @param concurrentUsers 并发用户数
 * @param requestsPerUser 每个用户的请求数
 * @returns 测试结果
 */
export async function loadTest(
  name: string,
  fn: () => Promise<{ success: boolean; responseTime: number }>,
  concurrentUsers: number = 10,
  requestsPerUser: number = 10,
): Promise<LoadTestResult> {
  const totalRequests = concurrentUsers * requestsPerUser;
  const results: { success: boolean; responseTime: number }[] = [];

  const startTime = Date.now();

  // 创建并发用户
  const users = Array(concurrentUsers).fill(null).map(async () => {
    for (let i = 0; i < requestsPerUser; i++) {
      const result = await fn();
      results.push(result);
    }
  });

  await Promise.all(users);
  const totalTime = Date.now() - startTime;

  // 计算统计数据
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const successRate = successfulRequests / totalRequests;

  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = responseTimes[0];
  const maxResponseTime = responseTimes[responseTimes.length - 1];
  const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
  const requestsPerSecond = (totalRequests / totalTime) * 1000;

  return {
    name,
    concurrentUsers,
    totalRequests,
    successfulRequests,
    failedRequests,
    successRate,
    totalTime,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    p95ResponseTime,
    p99ResponseTime,
    requestsPerSecond,
  };
}

/**
 * 格式化基准测试结果
 * @param result 测试结果
 * @returns 格式化后的字符串
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  return `
========================================
Benchmark: ${result.name}
========================================
Iterations:     ${result.iterations.toLocaleString()}
Total Time:     ${result.totalTime.toFixed(2)}ms
Avg Time:       ${result.avgTime.toFixed(3)}ms
Min Time:       ${result.minTime}ms
Max Time:       ${result.maxTime}ms
Median Time:    ${result.medianTime}ms
P95 Time:       ${result.p95Time}ms
P99 Time:       ${result.p99Time}ms
Ops/Second:     ${result.opsPerSecond.toFixed(2)}
========================================
  `.trim();
}

/**
 * 格式化负载测试结果
 * @param result 测试结果
 * @returns 格式化后的字符串
 */
export function formatLoadTestResult(result: LoadTestResult): string {
  return `
========================================
Load Test: ${result.name}
========================================
Concurrent Users:     ${result.concurrentUsers}
Total Requests:       ${result.totalRequests.toLocaleString()}
Successful:           ${result.successfulRequests.toLocaleString()}
Failed:               ${result.failedRequests.toLocaleString()}
Success Rate:         ${(result.successRate * 100).toFixed(2)}%
Total Time:           ${(result.totalTime / 1000).toFixed(2)}s
Avg Response Time:    ${result.avgResponseTime.toFixed(2)}ms
Min Response Time:    ${result.minResponseTime}ms
Max Response Time:    ${result.maxResponseTime}ms
P95 Response Time:    ${result.p95ResponseTime}ms
P99 Response Time:    ${result.p99ResponseTime}ms
Requests/Second:      ${result.requestsPerSecond.toFixed(2)}
========================================
  `.trim();
}

/**
 * 内存使用监控
 * @param duration 监控时长（毫秒）
 * @param interval 采样间隔（毫秒）
 * @returns 内存使用数据
 */
export async function monitorMemory(
  duration: number = 60000,
  interval: number = 1000,
): Promise<{ timestamps: number[]; heapUsed: number[]; heapTotal: number[]; external: number[] }> {
  const timestamps: number[] = [];
  const heapUsed: number[] = [];
  const heapTotal: number[] = [];
  const external: number[] = [];

  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    const usage = process.memoryUsage();
    timestamps.push(Date.now() - startTime);
    heapUsed.push(usage.heapUsed / 1024 / 1024); // MB
    heapTotal.push(usage.heapTotal / 1024 / 1024); // MB
    external.push(usage.external / 1024 / 1024); // MB

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return { timestamps, heapUsed, heapTotal, external };
}

/**
 * 生成性能报告
 * @param benchmarks 基准测试结果
 * @param loadTests 负载测试结果
 * @returns 报告字符串
 */
export function generatePerformanceReport(
  benchmarks: BenchmarkResult[],
  loadTests: LoadTestResult[],
): string {
  const report: string[] = [];

  report.push('# 性能测试报告');
  report.push(`\n生成时间: ${new Date().toISOString()}\n`);

  if (benchmarks.length > 0) {
    report.push('## 基准测试\n');
    benchmarks.forEach(b => {
      report.push(formatBenchmarkResult(b));
      report.push('');
    });
  }

  if (loadTests.length > 0) {
    report.push('## 负载测试\n');
    loadTests.forEach(l => {
      report.push(formatLoadTestResult(l));
      report.push('');
    });
  }

  return report.join('\n');
}

/**
 * 性能阈值检查
 * @param result 测试结果
 * @param thresholds 阈值配置
 * @returns 检查结果
 */
export function checkPerformanceThresholds(
  result: LoadTestResult,
  thresholds: {
    maxAvgResponseTime?: number;
    minSuccessRate?: number;
    maxP95ResponseTime?: number;
    minRequestsPerSecond?: number;
  },
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (thresholds.maxAvgResponseTime && result.avgResponseTime > thresholds.maxAvgResponseTime) {
    violations.push(
      `平均响应时间 ${result.avgResponseTime.toFixed(2)}ms 超过阈值 ${thresholds.maxAvgResponseTime}ms`,
    );
  }

  if (thresholds.minSuccessRate && result.successRate < thresholds.minSuccessRate) {
    violations.push(
      `成功率 ${(result.successRate * 100).toFixed(2)}% 低于阈值 ${thresholds.minSuccessRate * 100}%`,
    );
  }

  if (thresholds.maxP95ResponseTime && result.p95ResponseTime > thresholds.maxP95ResponseTime) {
    violations.push(
      `P95 响应时间 ${result.p95ResponseTime}ms 超过阈值 ${thresholds.maxP95ResponseTime}ms`,
    );
  }

  if (thresholds.minRequestsPerSecond && result.requestsPerSecond < thresholds.minRequestsPerSecond) {
    violations.push(
      `每秒请求数 ${result.requestsPerSecond.toFixed(2)} 低于阈值 ${thresholds.minRequestsPerSecond}`,
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
