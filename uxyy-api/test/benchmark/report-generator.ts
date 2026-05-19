/**
 * 性能测试报告生成器
 * 用于生成详细的性能测试报告
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestMetrics {
  name: string;
  timestamp: string;
  duration: number;
  success: boolean;
  error?: string;
}

export interface PerformanceReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
    timestamp: string;
  };
  benchmarks: Array<{
    name: string;
    iterations: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    p95Time: number;
    p99Time: number;
    opsPerSecond: number;
  }>;
  loadTests: Array<{
    name: string;
    concurrentUsers: number;
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
  }>;
  recommendations: string[];
}

/**
 * 生成 HTML 格式的性能报告
 * @param report 性能报告数据
 * @returns HTML 字符串
 */
export function generateHTMLReport(report: PerformanceReport): string {
  const benchmarkRows = report.benchmarks.map(b => `
    <tr>
      <td>${b.name}</td>
      <td>${b.iterations}</td>
      <td>${b.avgTime.toFixed(2)}ms</td>
      <td>${b.minTime}ms</td>
      <td>${b.maxTime}ms</td>
      <td>${b.p95Time}ms</td>
      <td>${b.p99Time}ms</td>
      <td>${b.opsPerSecond.toFixed(2)}</td>
    </tr>
  `).join('');

  const loadTestRows = report.loadTests.map(l => `
    <tr>
      <td>${l.name}</td>
      <td>${l.concurrentUsers}</td>
      <td>${l.totalRequests}</td>
      <td>${(l.successRate * 100).toFixed(2)}%</td>
      <td>${l.avgResponseTime.toFixed(2)}ms</td>
      <td>${l.p95ResponseTime}ms</td>
      <td>${l.p99ResponseTime}ms</td>
      <td>${l.requestsPerSecond.toFixed(2)}</td>
    </tr>
  `).join('');

  const recommendations = report.recommendations.map(r => `
    <li>${r}</li>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>性能测试报告 - 优效营</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }
    
    h1 {
      color: #1890ff;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 30px;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .summary-card h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #1890ff;
    }
    
    .summary-card.success .value {
      color: #52c41a;
    }
    
    .summary-card.error .value {
      color: #f5222d;
    }
    
    h2 {
      color: #333;
      margin: 30px 0 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #1890ff;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e8e8e8;
    }
    
    th {
      background: #fafafa;
      font-weight: 600;
      color: #333;
    }
    
    tr:hover {
      background: #f5f5f5;
    }
    
    .recommendations {
      background: #fff7e6;
      border: 1px solid #ffd591;
      border-radius: 8px;
      padding: 20px;
    }
    
    .recommendations h2 {
      color: #d46b08;
      border-bottom-color: #ffd591;
      margin-top: 0;
    }
    
    .recommendations ul {
      padding-left: 20px;
    }
    
    .recommendations li {
      margin-bottom: 8px;
      color: #d46b08;
    }
    
    .timestamp {
      text-align: right;
      color: #999;
      font-size: 12px;
      margin-top: 30px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .status-badge.success {
      background: #f6ffed;
      color: #389e0d;
      border: 1px solid #b7eb8f;
    }
    
    .status-badge.error {
      background: #fff2f0;
      color: #cf1322;
      border: 1px solid #ffa39e;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 性能测试报告</h1>
    <p class="subtitle">优效营系统性能基准测试与负载测试结果</p>
    
    <div class="summary">
      <div class="summary-card">
        <h3>总测试数</h3>
        <div class="value">${report.summary.totalTests}</div>
      </div>
      <div class="summary-card success">
        <h3>通过</h3>
        <div class="value">${report.summary.passedTests}</div>
      </div>
      <div class="summary-card error">
        <h3>失败</h3>
        <div class="value">${report.summary.failedTests}</div>
      </div>
      <div class="summary-card">
        <h3>总耗时</h3>
        <div class="value">${(report.summary.totalDuration / 1000).toFixed(2)}s</div>
      </div>
    </div>
    
    <h2>📊 基准测试结果</h2>
    <table>
      <thead>
        <tr>
          <th>测试名称</th>
          <th>迭代次数</th>
          <th>平均时间</th>
          <th>最小时间</th>
          <th>最大时间</th>
          <th>P95</th>
          <th>P99</th>
          <th>每秒操作数</th>
        </tr>
      </thead>
      <tbody>
        ${benchmarkRows}
      </tbody>
    </table>
    
    <h2>⚡ 负载测试结果</h2>
    <table>
      <thead>
        <tr>
          <th>测试名称</th>
          <th>并发用户</th>
          <th>总请求数</th>
          <th>成功率</th>
          <th>平均响应时间</th>
          <th>P95</th>
          <th>P99</th>
          <th>每秒请求数</th>
        </tr>
      </thead>
      <tbody>
        ${loadTestRows}
      </tbody>
    </table>
    
    <div class="recommendations">
      <h2>💡 优化建议</h2>
      <ul>
        ${recommendations}
      </ul>
    </div>
    
    <p class="timestamp">报告生成时间: ${report.summary.timestamp}</p>
  </div>
</body>
</html>
  `;
}

/**
 * 生成 Markdown 格式的性能报告
 * @param report 性能报告数据
 * @returns Markdown 字符串
 */
export function generateMarkdownReport(report: PerformanceReport): string {
  const benchmarkTable = report.benchmarks.map(b => 
    `| ${b.name} | ${b.iterations} | ${b.avgTime.toFixed(2)}ms | ${b.minTime}ms | ${b.maxTime}ms | ${b.p95Time}ms | ${b.p99Time}ms | ${b.opsPerSecond.toFixed(2)} |`
  ).join('\n');

  const loadTestTable = report.loadTests.map(l =>
    `| ${l.name} | ${l.concurrentUsers} | ${l.totalRequests} | ${(l.successRate * 100).toFixed(2)}% | ${l.avgResponseTime.toFixed(2)}ms | ${l.p95ResponseTime}ms | ${l.p99ResponseTime}ms | ${l.requestsPerSecond.toFixed(2)} |`
  ).join('\n');

  const recommendations = report.recommendations.map(r => `- ${r}`).join('\n');

  return `# 性能测试报告

## 摘要

- **总测试数**: ${report.summary.totalTests}
- **通过**: ${report.summary.passedTests}
- **失败**: ${report.summary.failedTests}
- **总耗时**: ${(report.summary.totalDuration / 1000).toFixed(2)}s
- **生成时间**: ${report.summary.timestamp}

## 基准测试结果

| 测试名称 | 迭代次数 | 平均时间 | 最小时间 | 最大时间 | P95 | P99 | 每秒操作数 |
|---------|---------|---------|---------|---------|-----|-----|-----------|
${benchmarkTable}

## 负载测试结果

| 测试名称 | 并发用户 | 总请求数 | 成功率 | 平均响应时间 | P95 | P99 | 每秒请求数 |
|---------|---------|---------|-------|-------------|-----|-----|-----------|
${loadTestTable}

## 优化建议

${recommendations}
`;
}

/**
 * 保存报告到文件
 * @param report 性能报告数据
 * @param outputDir 输出目录
 */
export function saveReport(report: PerformanceReport, outputDir: string = './test-reports'): void {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // 保存 HTML 报告
  const htmlReport = generateHTMLReport(report);
  fs.writeFileSync(path.join(outputDir, `performance-report-${timestamp}.html`), htmlReport);
  
  // 保存 Markdown 报告
  const markdownReport = generateMarkdownReport(report);
  fs.writeFileSync(path.join(outputDir, `performance-report-${timestamp}.md`), markdownReport);
  
  // 保存 JSON 报告
  fs.writeFileSync(
    path.join(outputDir, `performance-report-${timestamp}.json`),
    JSON.stringify(report, null, 2)
  );

  console.log(`Reports saved to ${outputDir}:`);
  console.log(`  - performance-report-${timestamp}.html`);
  console.log(`  - performance-report-${timestamp}.md`);
  console.log(`  - performance-report-${timestamp}.json`);
}

/**
 * 生成性能对比报告
 * @param current 当前测试结果
 * @param baseline 基准测试结果
 * @returns 对比报告
 */
export function generateComparisonReport(
  current: PerformanceReport,
  baseline: PerformanceReport,
): string {
  const comparisons: string[] = [];

  // 对比基准测试
  current.benchmarks.forEach((curr, index) => {
    const base = baseline.benchmarks[index];
    if (base) {
      const avgTimeDiff = ((curr.avgTime - base.avgTime) / base.avgTime) * 100;
      const opsDiff = ((curr.opsPerSecond - base.opsPerSecond) / base.opsPerSecond) * 100;
      
      comparisons.push(
        `### ${curr.name}\n` +
        `- 平均响应时间: ${curr.avgTime.toFixed(2)}ms (${avgTimeDiff > 0 ? '+' : ''}${avgTimeDiff.toFixed(2)}%)\n` +
        `- 每秒操作数: ${curr.opsPerSecond.toFixed(2)} (${opsDiff > 0 ? '+' : ''}${opsDiff.toFixed(2)}%)\n`
      );
    }
  });

  return `# 性能对比报告

## 对比摘要

- **当前测试时间**: ${current.summary.timestamp}
- **基准测试时间**: ${baseline.summary.timestamp}

## 详细对比

${comparisons.join('\n')}
`;
}
