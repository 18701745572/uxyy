import type { Page, Route } from "@playwright/test";

const iso = "2026-05-06T08:00:00.000Z";

function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
}

/** 与 `uxyy-api` 中老板角色权限集合一致（mock 全量） */
const BOSS_PERMISSION_MOCK = [
  "crm:read",
  "crm:write",
  "crm:delete",
  "inventory:read",
  "inventory:write",
  "inventory:stock",
  "inventory:purchase",
  "inventory:sales_order",
  "finance:read",
  "finance:write",
  "finance:voucher",
  "finance:report",
  "oa:read",
  "oa:approve",
  "oa:manage",
  "system:backup",
  "system:member",
  "system:audit_log",
] as const;

/** 与 `ROLE_PERMISSIONS.finance` 对齐 */
const FINANCE_PERMISSION_MOCK = [
  "finance:read",
  "finance:write",
  "finance:voucher",
  "finance:report",
  "crm:read",
  "inventory:read",
  "oa:read",
] as const;

export type ApiMockRolePreset = "boss" | "finance";

/**
 * 拦截浏览器发往 `/api/v1/...`（Playwright glob `** /api/v1/**`）的请求，返回与前端最小兼容的 JSON，
 * 使登录后路由在无 Nest 的环境下仍可跑 UI 级 E2E（见 `fixture.ts`）。
 */
export async function installApiMocks(
  page: Page,
  preset: ApiMockRolePreset = "boss",
): Promise<void> {
  await page.route("**/api/v1/**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    let pathname: string;
    try {
      pathname = new URL(url).pathname;
    } catch {
      return route.continue();
    }
    const sub = pathname.replace(/^\/api\/v1/, "");
    const method = req.method();

    if (method === "HEAD") {
      return route.fulfill({ status: 200, headers: {} });
    }

    const GET = (): Promise<void> => {
      if (sub === "/auth/profile" || sub.startsWith("/auth/profile?")) {
        return fulfillJson(route, {
          id: 1,
          sub: "1",
          enterpriseId: 1,
          phone: "13800138000",
          nickname: "E2E Mock",
          avatar: null,
          status: "active",
          createdAt: iso,
          enterprises: [
            {
              id: 1,
              name: "Mock 企业",
              role: preset === "finance" ? "finance" : "boss",
              isDefault: true,
            },
          ],
        });
      }
      if (sub === "/auth/permissions" || sub.startsWith("/auth/permissions?")) {
        const role = preset === "finance" ? "finance" : "boss";
        const permissions =
          preset === "finance"
            ? [...FINANCE_PERMISSION_MOCK]
            : [...BOSS_PERMISSION_MOCK];
        return fulfillJson(route, {
          roleRaw: role,
          canonicalRole: role,
          permissions,
          permissionCatalog: [],
          validRoleCodes: [],
          presets: [],
        });
      }
      if (sub === "/auth/enterprises" || sub.startsWith("/auth/enterprises?")) {
        return fulfillJson(route, [
          {
            id: 1,
            name: "Mock 企业",
            industry: "零售",
            role: preset === "finance" ? "finance" : "boss",
            isDefault: true,
          },
        ]);
      }
      if (
        sub.startsWith("/invitations/preview") ||
        sub.startsWith("/invitations/preview?")
      ) {
        return fulfillJson(route, {
          valid: true,
          enterpriseName: "Mock 企业邀请",
          inviteePhoneMasked: "138****8000",
          presetRole: "finance",
          expiresAt: iso,
        });
      }
      if (
        sub.startsWith("/oa/approval-flows/pending/list") ||
        sub.startsWith("/oa/approval-flows/pending/list?")
      ) {
        return fulfillJson(route, []);
      }
      if (
        sub === "/oa/attendance/make-up-requests/mine" ||
        sub.startsWith("/oa/attendance/make-up-requests/mine?")
      ) {
        return fulfillJson(route, []);
      }
      if (sub.startsWith("/crm/customers")) {
        return fulfillJson(route, {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      }
      if (sub.startsWith("/inventory/products")) {
        return fulfillJson(route, {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      }
      if (sub.startsWith("/inventory/suppliers")) {
        return fulfillJson(route, { items: [], total: 0 });
      }
      if (sub.startsWith("/inventory/purchase-orders")) {
        return fulfillJson(route, {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      }
      if (sub.startsWith("/inventory/sales-orders")) {
        return fulfillJson(route, {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      }
      if (
        /^\/inventory\/stocktaking(\?|$)/.test(sub) ||
        sub.startsWith("/inventory/stocktaking?")
      ) {
        return fulfillJson(route, {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      }
      {
        const m = sub.match(/^\/inventory\/stocktaking\/(\d+)$/);
        if (m) {
          const id = Number(m[1]);
          return fulfillJson(route, {
            id,
            stocktakingNo: `ST-${id}`,
            warehouseId: 1,
            status: "draft",
            remark: undefined,
            items: [],
            createdAt: iso,
            updatedAt: iso,
          });
        }
      }
      if (sub.startsWith("/finance/account-subjects")) {
        return fulfillJson(route, [
          {
            id: 1001,
            code: "1001",
            name: "库存现金",
            type: "asset",
            isActive: true,
            balance: "0",
            createdAt: iso,
            updatedAt: iso,
          },
        ]);
      }
      if (sub.startsWith("/finance/invoices")) {
        return fulfillJson(route, {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      }
      if (sub.startsWith("/finance/vouchers")) {
        return fulfillJson(route, {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      }
      if (sub.startsWith("/finance/reports/dashboard")) {
        return fulfillJson(route, {
          period: "month",
          salesAmount: "0",
          salesOrderCount: 0,
          purchaseAmount: "0",
          purchaseOrderCount: 0,
          grossProfit: "0",
          grossProfitRate: "0",
          pendingReceivable: "0",
          pendingPayable: "0",
          lowStockProducts: [],
          topSalesProducts: [],
        });
      }
      if (sub.startsWith("/finance/reports/balance-sheet")) {
        return fulfillJson(route, { assets: [], liabilities: [], equity: [] });
      }
      if (sub.startsWith("/finance/reports/income-statement")) {
        return fulfillJson(route, { items: [], totalIncome: "0", totalExpense: "0" });
      }
      if (sub.startsWith("/finance/reports/cash-flow")) {
        return fulfillJson(route, { flows: [] });
      }
      if (sub.startsWith("/finance/reports/ar-ap")) {
        return fulfillJson(route, {
          receivables: [],
          payables: [],
          totalReceivables: "0.00",
          totalPayables: "0.00",
        });
      }
      if (sub.startsWith("/ai/queue/stats")) {
        const emptyCounts = {
          waiting: 0,
          active: 0,
          delayed: 0,
          prioritized: 0,
          paused: 0,
          waitingChildren: 0,
          completed: 0,
          failed: 0,
        };
        return fulfillJson(route, {
          queue: "mock-ai-queue",
          counts: emptyCounts,
          dlqQueue: "mock-ai-dlq",
          dlqCounts: emptyCounts,
        });
      }
      const mockAiTask = (taskId: number) => ({
        id: taskId,
        taskType: "accounting_suggestion",
        status: "completed" as const,
        clientKey: null,
        inputPayload: null,
        outputPayload: null,
        errorMessage: null,
        attempts: 1,
        createdAt: iso,
        updatedAt: iso,
      });
      if (sub.startsWith("/ai/tasks/by-client-key")) {
        return fulfillJson(route, mockAiTask(1));
      }
      {
        const m = sub.match(/^\/ai\/tasks\/(\d+)$/);
        if (m) {
          return fulfillJson(route, mockAiTask(Number(m[1])));
        }
      }
      if (sub === "/ai/tasks" || sub.startsWith("/ai/tasks?")) {
        return fulfillJson(route, { items: [], total: 0, page: 1, pageSize: 20 });
      }
      if (sub === "/enterprise/members" || sub.startsWith("/enterprise/members?")) {
        return fulfillJson(route, [
          {
            userId: 1,
            phone: "13800138000",
            nickname: "E2E Mock",
            role: preset === "finance" ? "finance" : "boss",
            isDefault: true,
            isOwner: preset !== "finance",
          },
        ]);
      }
      /** 兜底：前端若新增 GET，至少拿到空数组而非 JSON 报错 */
      return fulfillJson(route, []);
    };

    const okJson = (): Promise<void> =>
      fulfillJson(route, { ok: true, message: "e2e-mock" });

    if (method === "GET") {
      return GET();
    }
    if (
      method === "POST" &&
      (sub === "/invitations/accept" || sub === "/auth/register-invite")
    ) {
      return fulfillJson(route, {
        access_token: "e2e-mock-invite-at",
        refresh_token: "e2e-mock-invite-rt",
        token_type: "Bearer",
        user: { id: 1, phone: "13800138000", nickname: "E2E Mock" },
        enterprise: { id: 1 },
      });
    }
    if (method === "POST" && sub === "/enterprise/members/invitations") {
      return fulfillJson(route, {
        joinRelativePath: `/join?t=${"e".repeat(40)}`,
        expiresAt: iso,
      });
    }
    if (method === "POST" && sub === "/finance/invoices/ocr") {
      return fulfillJson(route, {
        invoiceNo: "4400123111",
        invoiceCode: "044001900211",
        type: "normal",
        amount: "10000.00",
        taxRate: "13.00",
        taxAmount: "1300.00",
        totalAmount: "11300.00",
        buyerName: "E2E OCR 买方",
        buyerTaxNo: "914400000000000000",
        sellerName: "E2E OCR 卖方",
        sellerTaxNo: "914400000000000001",
        issueDate: "2026-05-01",
        ocrConfidence: 0.95,
      });
    }
    if (method === "POST" && sub === "/finance/invoices") {
      const nowId = Math.floor(Date.now() / 1000) % 1_000_000;
      return fulfillJson(route, {
        id: nowId,
        enterpriseId: 1,
        invoiceNo: `MOCK-${nowId}`,
        invoiceCode: null,
        type: "normal",
        amount: "10000.00",
        taxRate: "13.00",
        taxAmount: "1300.00",
        totalAmount: "11300.00",
        buyerName: null,
        buyerTaxNo: null,
        sellerName: null,
        sellerTaxNo: null,
        issueDate: iso,
        status: "unverified",
        ocrData: null,
        sourceType: null,
        sourceId: null,
        createdBy: null,
        createdAt: iso,
      });
    }
    if (
      preset === "finance" &&
      method === "POST" &&
      (sub === "/crm/customers" || sub.startsWith("/crm/customers?"))
    ) {
      return fulfillJson(
        route,
        {
          statusCode: 403,
          message: "缺少权限，需要其一: crm:write",
        },
        403,
      );
    }
    if (method === "POST" && sub === "/ai/tasks") {
      return fulfillJson(route, {
        id: 999001,
        taskType: "accounting_suggestion",
        status: "pending",
        clientKey: null,
        inputPayload: null,
        outputPayload: null,
        errorMessage: null,
        attempts: 0,
        createdAt: iso,
        updatedAt: iso,
      });
    }
    if (
      ["POST", "PATCH", "PUT", "DELETE"].includes(method)
    ) {
      return okJson();
    }

    return route.continue();
  });
}
