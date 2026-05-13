/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 从环境变量读取 API 地址，支持 Sealos 等云平台部署
    // 本地开发默认使用 localhost:3001
    const apiUrl = process.env.API_URL || 'http://127.0.0.1:3001';

    return [
      {
        // 把前端请求的 /api/xxx 代理到后端服务
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  // 图片域名配置（如果有外部图片资源）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 输出 standalone 模式，适合容器化部署
  // 注意：Windows 上需要管理员权限才能创建符号链接
  // 在 Windows 开发环境中可以注释掉这一行
  output: 'standalone',
  // 解决 Phosphor Icons SSR 问题
  transpilePackages: ['@phosphor-icons/react'],
};

export default nextConfig;
