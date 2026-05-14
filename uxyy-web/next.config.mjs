import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 浏览器走相对路径 `/api/*` 时由此代理到 Nest（须为后端端口，勿用 Next 自身端口）
    const apiUrl = process.env.API_URL || 'http://127.0.0.1:3000';

    return [
      {
        // 把前端请求的 /api/xxx 代理到后端服务
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  // 图片域名配置（已优化为更安全、高效的配置）
  images: {
    // 限制远程图片域名，提高安全性
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    // 优先使用现代图片格式，减少文件大小
    formats: ['image/webp', 'image/avif'],
    // 设备尺寸断点，优化响应式图片
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // 图片缓存时间（秒）
    minimumCacheTTL: 60,
  },
  // 输出 standalone 模式，适合容器化部署
  // 注意：Windows 上需要管理员权限才能创建符号链接
  // 在 Windows 开发环境中可以注释掉这一行
  output: 'standalone',
  // 解决 Phosphor Icons SSR 问题
  transpilePackages: ['@phosphor-icons/react'],
  // 实验性功能：Web Vitals 归因分析
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
  },
  // 压缩优化
  compress: true,
  // 启用 SWC 压缩（Next.js 14 默认）
  swcMinify: true,
};

// 仅在 ANALYZE=true 时启用 Bundle Analyzer
export default process.env.ANALYZE === 'true'
  ? withBundleAnalyzer({ enabled: true })(nextConfig)
  : nextConfig;
