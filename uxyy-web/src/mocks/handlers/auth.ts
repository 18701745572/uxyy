import { http, HttpResponse } from "msw";

const MOCK_USER = {
  id: 1,
  phone: "13800138000",
};

const MOCK_TOKEN = "mock-jwt-token-for-dev";

export const authHandlers = [
  http.post("*/api/v1/auth/register", async ({ request }) => {
    const body = (await request.json()) as {
      phone: string;
      password: string;
      smsCode: string;
      enterpriseName: string;
    };
    if (!body.phone || !body.password || !body.enterpriseName) {
      return HttpResponse.json(
        { message: "请填写所有必填字段" },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      userId: 1,
      enterpriseId: 1,
      accessToken: MOCK_TOKEN,
      refreshToken: "mock-refresh-token",
      expiresIn: 7200,
    });
  }),

  http.post("*/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as { phone: string; password: string };
    if (!body.phone || !body.password) {
      return HttpResponse.json(
        { message: "手机号和密码不能为空" },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      access_token: MOCK_TOKEN,
      token_type: "Bearer",
      user: MOCK_USER,
      enterprise: { id: 1 },
    });
  }),

  http.get("*/api/v1/auth/profile", () => {
    return HttpResponse.json({
      sub: String(MOCK_USER.id),
      enterpriseId: 1,
    });
  }),

  http.get("*/api/v1/auth/enterprises", () => {
    return HttpResponse.json([
      { id: 1, name: "某某商贸有限公司", industry: "批发零售", role: "owner", isDefault: true },
      { id: 2, name: "优效营科技", industry: "信息技术", role: "admin", isDefault: false },
    ]);
  }),
];
