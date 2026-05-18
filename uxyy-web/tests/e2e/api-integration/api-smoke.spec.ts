import { expect, test } from "@playwright/test";

/**
 * API 集成测试 - 冒烟测试
 * 验证后端 API 基本可用性
 */
const API_BASE = process.env.E2E_API_URL ?? "http://localhost:3000/api/v1";

test.describe("API 集成测试 · 认证", () => {
  test("健康检查端点可用", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test("登录接口正常工作", async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {
        phone: "13800138000",
        password: "Dev12345!",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.access_token).toBeDefined();
    expect(body.user).toBeDefined();
  });

  test("登录失败返回 401", async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {
        phone: "13800138000",
        password: "wrongpassword",
      },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe("API 集成测试 · CRM", () => {
  test("客户列表需要认证", async ({ request }) => {
    const response = await request.get(`${API_BASE}/crm/customers`);
    expect(response.status()).toBe(401);
  });

  test("客户列表接口（已认证）", async ({ request }) => {
    // 先登录获取 token
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        phone: "13800138000",
        password: "Dev12345!",
      },
    });
    const { access_token } = await loginRes.json();

    // 使用 token 访问客户列表
    const response = await request.get(`${API_BASE}/crm/customers`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.items ?? body.data ?? body)).toBeTruthy();
  });
});

test.describe("API 集成测试 · 库存", () => {
  test("商品列表接口（已认证）", async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        phone: "13800138000",
        password: "Dev12345!",
      },
    });
    const { access_token } = await loginRes.json();

    const response = await request.get(`${API_BASE}/inventory/products`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
  });
});

test.describe("API 集成测试 · 财务", () => {
  test("发票列表接口（已认证）", async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        phone: "13800138000",
        password: "Dev12345!",
      },
    });
    const { access_token } = await loginRes.json();

    const response = await request.get(`${API_BASE}/finance/invoices`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
  });
});

test.describe("API 集成测试 · OA", () => {
  test("考勤记录接口（已认证）", async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        phone: "13800138000",
        password: "Dev12345!",
      },
    });
    const { access_token } = await loginRes.json();

    const response = await request.get(`${API_BASE}/oa/attendance/personal`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test("通知列表接口（已认证）", async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        phone: "13800138000",
        password: "Dev12345!",
      },
    });
    const { access_token } = await loginRes.json();

    const response = await request.get(`${API_BASE}/oa/notifications`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
  });
});
