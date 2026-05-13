"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@uxyy/shared";
import { useAuth } from "@/components/auth/auth-context";
import { Logo } from "@/components/logo";

// ============================================
// 顶级艺术设计登录页面 - 酷炫 SVG 动画背景
// 融合 Minimal UX Supreme + UI/UX Pro Max 设计原则
// ============================================

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 鼠标追踪效果
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const parsed = loginSchema.safeParse({ phone, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LoginInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      await login(parsed.data);
      router.replace("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "登录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a]">
      {/* ============================================
          酷炫 SVG 动画背景层
      ============================================ */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 动态渐变背景 */}
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-out"
          style={{
            background: `
              radial-gradient(
                circle at ${mousePosition.x}% ${mousePosition.y}%, 
                rgba(59, 130, 246, 0.15) 0%, 
                rgba(139, 92, 246, 0.1) 25%, 
                rgba(236, 72, 153, 0.05) 50%, 
                transparent 70%
              ),
              linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)
            `,
          }}
        />

        {/* 粒子网络动画 */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3">
                <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3">
                <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* 动态连接线 */}
          <g opacity="0.4">
            <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="url(#lineGradient)" strokeWidth="1">
              <animate attributeName="x1" values="10%;12%;10%" dur="8s" repeatCount="indefinite" />
              <animate attributeName="y1" values="20%;18%;20%" dur="8s" repeatCount="indefinite" />
            </line>
            <line x1="30%" y1="40%" x2="50%" y2="30%" stroke="url(#lineGradient)" strokeWidth="1">
              <animate attributeName="x2" values="50%;52%;50%" dur="6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="30%;32%;30%" dur="6s" repeatCount="indefinite" />
            </line>
            <line x1="50%" y1="30%" x2="70%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1">
              <animate attributeName="x1" values="50%;48%;50%" dur="7s" repeatCount="indefinite" />
              <animate attributeName="y1" values="30%;28%;30%" dur="7s" repeatCount="indefinite" />
            </line>
            <line x1="70%" y1="50%" x2="90%" y2="30%" stroke="url(#lineGradient)" strokeWidth="1">
              <animate attributeName="x2" values="90%;88%;90%" dur="9s" repeatCount="indefinite" />
              <animate attributeName="y2" values="30%;28%;30%" dur="9s" repeatCount="indefinite" />
            </line>
            <line x1="20%" y1="60%" x2="40%" y2="80%" stroke="url(#lineGradient)" strokeWidth="1">
              <animate attributeName="x1" values="20%;22%;20%" dur="5s" repeatCount="indefinite" />
              <animate attributeName="y1" values="60%;62%;60%" dur="5s" repeatCount="indefinite" />
            </line>
            <line x1="40%" y1="80%" x2="60%" y2="70%" stroke="url(#lineGradient)" strokeWidth="1">
              <animate attributeName="x2" values="60%;58%;60%" dur="7s" repeatCount="indefinite" />
              <animate attributeName="y2" values="70%;68%;70%" dur="7s" repeatCount="indefinite" />
            </line>
            <line x1="60%" y1="70%" x2="80%" y2="90%" stroke="url(#lineGradient)" strokeWidth="1">
              <animate attributeName="x1" values="60%;62%;60%" dur="6s" repeatCount="indefinite" />
              <animate attributeName="y1" values="70%;72%;70%" dur="6s" repeatCount="indefinite" />
            </line>
          </g>

          {/* 发光节点 */}
          <g filter="url(#glow)">
            <circle r="3" fill="#3b82f6" opacity="0.8">
              <animate attributeName="cx" values="10%;12%;10%" dur="8s" repeatCount="indefinite" />
              <animate attributeName="cy" values="20%;18%;20%" dur="8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#8b5cf6" opacity="0.8">
              <animate attributeName="cx" values="30%;32%;30%" dur="6s" repeatCount="indefinite" />
              <animate attributeName="cy" values="40%;38%;40%" dur="6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle r="4" fill="#3b82f6" opacity="0.8">
              <animate attributeName="cx" values="50%;48%;50%" dur="7s" repeatCount="indefinite" />
              <animate attributeName="cy" values="30%;32%;30%" dur="7s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#ec4899" opacity="0.8">
              <animate attributeName="cx" values="70%;72%;70%" dur="5s" repeatCount="indefinite" />
              <animate attributeName="cy" values="50%;48%;50%" dur="5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#8b5cf6" opacity="0.8">
              <animate attributeName="cx" values="90%;88%;90%" dur="9s" repeatCount="indefinite" />
              <animate attributeName="cy" values="30%;32%;30%" dur="9s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#3b82f6" opacity="0.8">
              <animate attributeName="cx" values="20%;22%;20%" dur="6s" repeatCount="indefinite" />
              <animate attributeName="cy" values="60%;62%;60%" dur="6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="4" fill="#ec4899" opacity="0.8">
              <animate attributeName="cx" values="40%;38%;40%" dur="7s" repeatCount="indefinite" />
              <animate attributeName="cy" values="80%;78%;80%" dur="7s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#8b5cf6" opacity="0.8">
              <animate attributeName="cx" values="60%;62%;60%" dur="8s" repeatCount="indefinite" />
              <animate attributeName="cy" values="70%;72%;70%" dur="8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#3b82f6" opacity="0.8">
              <animate attributeName="cx" values="80%;78%;80%" dur="5s" repeatCount="indefinite" />
              <animate attributeName="cy" values="90%;88%;90%" dur="5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>

        {/* 旋转几何图形 */}
        <svg 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] opacity-20" 
          viewBox="0 0 600 600"
          style={{
            transform: `translate(-50%, -50%) rotate(${mousePosition.x * 0.5}deg)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <defs>
            <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* 六边形网格 */}
          <g stroke="url(#hexGradient)" strokeWidth="1" fill="none">
            <polygon points="300,100 400,150 400,250 300,300 200,250 200,150">
              <animateTransform attributeName="transform" type="rotate" from="0 300 200" to="360 300 200" dur="60s" repeatCount="indefinite" />
            </polygon>
            <polygon points="300,200 450,275 450,425 300,500 150,425 150,275">
              <animateTransform attributeName="transform" type="rotate" from="360 300 350" to="0 300 350" dur="80s" repeatCount="indefinite" />
            </polygon>
            <polygon points="300,50 500,150 500,350 300,450 100,350 100,150">
              <animateTransform attributeName="transform" type="rotate" from="0 300 250" to="360 300 250" dur="100s" repeatCount="indefinite" />
            </polygon>
          </g>
        </svg>

        {/* 右侧旋转圆环 */}
        <svg 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] opacity-15" 
          viewBox="0 0 500 500"
          style={{
            transform: `translate(50%, 50%) rotate(${-mousePosition.y * 0.3}deg)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <g stroke="url(#ringGradient)" strokeWidth="2" fill="none">
            <circle cx="250" cy="250" r="100">
              <animate attributeName="r" values="100;120;100" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="250" cy="250" r="150">
              <animate attributeName="r" values="150;170;150" dur="5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.3;0.6" dur="5s" repeatCount="indefinite" />
            </circle>
            <circle cx="250" cy="250" r="200">
              <animate attributeName="r" values="200;220;200" dur="6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.2;0.4" dur="6s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>

        {/* 浮动粒子 */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-500 rounded-full opacity-40"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* 扫描线效果 */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59, 130, 246, 0.03) 2px, rgba(59, 130, 246, 0.03) 4px)',
          }}
        />
      </div>

      {/* 浮动动画样式 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>

      {/* ============================================
          主内容区域
      ============================================ */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          
          {/* ============================================
              品牌标识区域
          ============================================ */}
          <div className="mb-10 text-center">
            {/* Logo - 简洁大方白色版本 */}
            <div className="inline-flex items-center justify-center mb-6">
              <Logo size="lg" variant="light" />
            </div>
            
            <h1 className="text-[32px] font-bold tracking-tight text-white mb-2">
              优效营
            </h1>
            <p className="text-[15px] text-text-muted font-normal tracking-wide">
              登录您的企业账号
            </p>
          </div>

          {/* ============================================
              登录表单卡片 - 玻璃拟态效果
          ============================================ */}
          <div className="relative">
            {/* 卡片发光边框 */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-sm" />
            
            <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* 手机号输入 */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="phone" 
                    className="block text-[13px] font-medium text-zinc-300 mb-1.5"
                  >
                    手机号
                  </label>
                  <div className="relative">
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="请输入手机号"
                      autoComplete="tel"
                      className={`
                        w-full h-12 px-4 py-2.5 
                        bg-zinc-900/60 border rounded-xl
                        text-[15px] text-white placeholder:text-text-tertiary
                        transition-all duration-200 ease-out
                        focus:outline-none
                        ${errors.phone 
                          ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20' 
                          : focusedField === 'phone'
                            ? 'border-blue-500/50 ring-2 ring-blue-500/20'
                            : 'border-zinc-700/50 hover:border-zinc-600'
                        }
                      `}
                    />
                    {/* 聚焦发光效果 */}
                    <div 
                      className={`
                        absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none
                        ${focusedField === 'phone' ? 'opacity-100' : ''}
                      `}
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.2))',
                        filter: 'blur(4px)',
                        zIndex: -1,
                      }}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[13px] text-red-400 mt-1.5 flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                        <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
                        <path d="M7 4v3.5" stroke="currentColor" strokeLinecap="round" />
                        <circle cx="7" cy="10" r="0.5" fill="currentColor" />
                      </svg>
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* 密码输入 */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="password" 
                    className="block text-[13px] font-medium text-zinc-300 mb-1.5"
                  >
                    密码
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      className={`
                        w-full h-12 px-4 py-2.5 
                        bg-zinc-900/60 border rounded-xl
                        text-[15px] text-white placeholder:text-text-tertiary
                        transition-all duration-200 ease-out
                        focus:outline-none
                        ${errors.password 
                          ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20' 
                          : focusedField === 'password'
                            ? 'border-blue-500/50 ring-2 ring-blue-500/20'
                            : 'border-zinc-700/50 hover:border-zinc-600'
                        }
                      `}
                    />
                    {/* 聚焦发光效果 */}
                    <div 
                      className={`
                        absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none
                        ${focusedField === 'password' ? 'opacity-100' : ''}
                      `}
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.2))',
                        filter: 'blur(4px)',
                        zIndex: -1,
                      }}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-[13px] text-red-400 mt-1.5 flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                        <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
                        <path d="M7 4v3.5" stroke="currentColor" strokeLinecap="round" />
                        <circle cx="7" cy="10" r="0.5" fill="currentColor" />
                      </svg>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* 服务器错误提示 */}
                {serverError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-400 mt-0.5 flex-shrink-0">
                      <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
                      <path d="M8 4.5v4" stroke="currentColor" strokeLinecap="round" />
                      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
                    </svg>
                    <p className="text-[13px] text-red-300 leading-relaxed">{serverError}</p>
                  </div>
                )}

                {/* 登录按钮 - 渐变发光 */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`
                    relative w-full h-12 px-4 py-2.5 rounded-xl overflow-hidden
                    text-[15px] font-medium text-white
                    transition-all duration-200 ease-out
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900
                    ${submitting 
                      ? 'cursor-not-allowed bg-gradient-to-r from-zinc-600 to-zinc-700' 
                      : 'hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x'
                    }
                  `}
                >
                  {/* 按钮光泽效果 */}
                  <div 
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                    }}
                  />
                  
                  {submitting ? (
                    <span className="relative flex items-center justify-center gap-2">
                      <svg 
                        className="animate-spin h-4 w-4" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      登录中...
                    </span>
                  ) : (
                    <span className="relative">登录</span>
                  )}
                </button>

                {/* 注册链接 */}
                <div className="text-center pt-2">
                  <p className="text-[14px] text-text-muted">
                    还没有账号？{' '}
                    <Link
                      href="/register"
                      className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-medium hover:from-blue-300 hover:to-purple-300 transition-all duration-150"
                    >
                      免费注册
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* ============================================
              底部装饰
          ============================================ */}
          <div className="mt-12 flex items-center justify-center gap-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-600 to-zinc-600" />
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-tertiary">
                <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
                <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.4" />
                <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.4" />
                <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.2" />
              </svg>
              <span className="text-[12px] text-text-tertiary tracking-widest uppercase">
                Enterprise SaaS
              </span>
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent via-zinc-600 to-zinc-600" />
          </div>

          {/* 版权信息 */}
          <p className="text-center text-[12px] text-text-secondary mt-6">
            © 2024 优效营 uxyy. All rights reserved.
          </p>
        </div>
      </div>

      {/* 全局样式 - 覆盖浏览器自动填充 */}
      <style jsx global>{`
        /* 覆盖浏览器自动填充的背景色 */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(24, 24, 27, 0.6) inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}
