import { expect, test } from "@playwright/test";

/**
 * API 集成测试 - 业务流程
 * 测试完整的 API 业务流程
 */
const API_BASE = process.env.E2E_API_URL ?? "http://localhost:3000/api/v1";

async function getAuthToken(request: any): Promise<string> {
  const loginRes = await request.post(`${API_BASE}/auth/login`, {
    data: {
      phone: "13800138000",
      password: "Dev12345!",
    },
  });
  const { access_token } = await loginRes.json();
  return access_token;
}

test.describe("API 工作流测试 · 客户管理", () => {
  test("完整客户生命周期", async ({ request }) => {
    const token = await getAuthToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // 1. 创建客户
    const timestamp = Date.now();
    const createRes = await request.post(`${API_BASE}/crm/customers`, {
      headers,
      data: {
        name: `API测试客户-${timestamp}`,
        phone: `138${String(timestamp).slice(-8)}`,
        type: "enterprise",
        level: "regular",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createdCustomer = await createRes.json();
    const customerId = createdCustomer.id;
    expect(customerId).toBeDefined();

    // 2. 获取客户详情
    const getRes = await request.get(`${API_BASE}/crm/customers/${customerId}`, {
      headers,
    });
    expect(getRes.ok()).toBeTruthy();
    const customer = await getRes.json();
    expect(customer.id).toBe(customerId);

    // 3. 更新客户
    const updateRes = await request.patch(`${API_BASE}/crm/customers/${customerId}`, {
      headers,
      data: {
        name: `API测试客户-已更新-${timestamp}`,
      },
    });
    expect(updateRes.ok()).toBeTruthy();

    // 4. 删除客户
    const deleteRes = await request.delete(`${API_BASE}/crm/customers/${customerId}`, {
      headers,
    });
    expect(deleteRes.ok()).toBeTruthy();
  });
});

test.describe("API 工作流测试 · 商品管理", () => {
  test("商品 CRUD 操作", async ({ request }) => {
    const token = await getAuthToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // 1. 创建商品
    const timestamp = Date.now();
    const createRes = await request.post(`${API_BASE}/inventory/products`, {
      headers,
      data: {
        name: `API测试商品-${timestamp}`,
        code: `SKU-${timestamp}`,
        unitPrice: 100,
        categoryId: 1,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createdProduct = await createRes.json();
    const productId = createdProduct.id;
    expect(productId).toBeDefined();

    // 2. 获取商品列表
    const listRes = await request.get(`${API_BASE}/inventory/products`, { headers });
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.items ?? listBody)).toBeTruthy();

    // 3. 更新商品
    const updateRes = await request.patch(`${API_BASE}/inventory/products/${productId}`, {
      headers,
      data: {
        unitPrice: 120,
      },
    });
    expect(updateRes.ok()).toBeTruthy();

    // 4. 删除商品
    const deleteRes = await request.delete(`${API_BASE}/inventory/products/${productId}`, {
      headers,
    });
    expect(deleteRes.ok()).toBeTruthy();
  });
});

test.describe("API 工作流测试 · 发票管理", () => {
  test("发票列表查询", async ({ request }) => {
    const token = await getAuthToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // 获取发票列表
    const listRes = await request.get(`${API_BASE}/finance/invoices`, { headers });
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.items ?? listBody)).toBeTruthy();
  });
});

test.describe("API 工作流测试 · 考勤", () => {
  test("打卡流程", async ({ request }) => {
    const token = await getAuthToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // 获取考勤记录
    const recordsRes = await request.get(`${API_BASE}/oa/attendance/personal`, { headers });
    expect(recordsRes.ok()).toBeTruthy();
    const recordsBody = await recordsRes.json();
    expect(recordsBody).toBeDefined();
  });
});
