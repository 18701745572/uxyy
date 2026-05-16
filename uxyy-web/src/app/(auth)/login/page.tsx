"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@uxyy/shared";
import { useAuth } from "@/components/auth/auth-context";
import { Logo } from "@/components/logo";
import { AuroraBackdrop } from "@/components/ui/aurora-backdrop";

/**
 * 登录页：深色基底 + SVG 有机光斑 + 半透明装饰层 + CSS3 光源漂移动画
 */
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
      // 登录成功后直接跳转，保持 loading 状态直到页面跳转完成
      // 这样用户不会看到按钮状态变化，体验更流畅
      await router.replace("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "登录失败，请重试");
      setSubmitting(false);
    }
    // 注意：成功时不重置 submitting，让 loading 状态保持到页面跳转
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05050a]">
      <AuroraBackdrop />

      {/* 主内容区域 */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          
          {/* 品牌标识区域 */}
          <div className="mb-10 text-center">
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

          {/* 登录表单卡片 */}
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
                  </div>
                  {errors.phone && (
                    <p className="text-[13px] text-red-400 mt-1.5 flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full border border-red-400 flex items-center justify-center text-[10px]">!</span>
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
                  </div>
                  {errors.password && (
                    <p className="text-[13px] text-red-400 mt-1.5 flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full border border-red-400 flex items-center justify-center text-[10px]">!</span>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* 服务器错误提示 */}
                {serverError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <span className="text-red-400 mt-0.5">!</span>
                    <p className="text-[13px] text-red-300 leading-relaxed">{serverError}</p>
                  </div>
                )}

                {/* 登录按钮 */}
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
                      : 'hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
                    }
                  `}
                >
                  {submitting ? (
                    <span className="relative flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
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
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      免费注册
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* 底部装饰 */}
          <div className="mt-12 flex items-center justify-center gap-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-600 to-zinc-600" />
            <span className="text-[12px] text-text-tertiary tracking-widest uppercase">
              Enterprise SaaS
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent via-zinc-600 to-zinc-600" />
          </div>

          {/* 版权信息 */}
          <p className="text-center text-[12px] text-text-secondary mt-6">
            © 2026 优效营 uxyy.cn All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
