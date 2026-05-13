"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema, type RegisterInput } from "@uxyy/shared";
import { register as registerApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function RegisterForm() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [enterpriseName, setEnterpriseName] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const parsed = registerSchema.safeParse({
      phone,
      password,
      smsCode,
      enterpriseName,
    });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RegisterInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      await registerApi(parsed.data);
      router.replace("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-center">
          注册优效营
        </h1>
        <p className="text-sm text-text-secondary text-center">
          创建企业账号，开始免费使用
        </p>

        <Input
          label="手机号"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="13800138000"
          error={errors.phone}
          autoComplete="tel"
        />

        <Input
          label="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 8 位"
          error={errors.password}
          autoComplete="new-password"
        />

        <Input
          label="验证码"
          value={smsCode}
          onChange={(e) => setSmsCode(e.target.value)}
          placeholder="开发环境输入任意值"
          error={errors.smsCode}
        />

        <Input
          label="企业名称"
          value={enterpriseName}
          onChange={(e) => setEnterpriseName(e.target.value)}
          placeholder="某某商贸有限公司"
          error={errors.enterpriseName}
        />

        {serverError && (
          <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          注册
        </Button>

        <p className="text-center text-sm text-text-secondary">
          已有账号？{" "}
          <Link
            href="/login"
            className="text-text-primary underline underline-offset-4 hover:text-text-secondary"
          >
            去登录
          </Link>
        </p>
      </form>
    </Card>
  );
}
