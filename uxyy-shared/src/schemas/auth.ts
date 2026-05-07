import { z } from "zod";

/** 登录请求：与 NestJS LoginDto 对齐 */
export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "请输入手机号")
    .regex(/^1\d{10}$/, "手机号格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** 登录成功响应 */
export const loginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("Bearer"),
  user: z.object({
    id: z.number(),
    phone: z.string(),
  }),
  enterprise: z
    .object({
      id: z.number(),
    })
    .nullable(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** GET /auth/profile 返回的 JWT 载荷 */
export const profileSchema = z.object({
  sub: z.string(),
  enterpriseId: z.number().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type ProfilePayload = z.infer<typeof profileSchema>;

/** 用户注册：与 PRD §9.2.1 对齐 */
export const registerSchema = z.object({
  phone: z
    .string()
    .min(1, "请输入手机号")
    .regex(/^1\d{10}$/, "手机号格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
  smsCode: z.string().min(1, "请输入验证码"),
  enterpriseName: z.string().min(1, "请输入企业名称").max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** 注册成功响应 */
export const registerResponseSchema = z.object({
  userId: z.number(),
  enterpriseId: z.number(),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;
