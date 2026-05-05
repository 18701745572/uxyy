import { http, HttpResponse } from "msw";

interface MockCustomer {
  id: number;
  enterpriseId: number;
  name: string;
  phone: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

let nextId = 4;
const seed: MockCustomer[] = [
  {
    id: 1,
    enterpriseId: 1,
    name: "杭州某某商行",
    phone: "0571-88112233",
    remark: "重点客户 · 月结",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    enterpriseId: 1,
    name: "上海科技有限公司",
    phone: "021-55667788",
    remark: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    enterpriseId: 1,
    name: "北京贸易公司",
    phone: "010-99887766",
    remark: "新客户",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const crmHandlers = [
  http.get("*/api/v1/crm/customers", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 20;
    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      items: seed.slice(start, start + pageSize),
      total: seed.length,
      page,
      pageSize,
    });
  }),

  http.post("*/api/v1/crm/customers", async ({ request }) => {
    const body = (await request.json()) as Partial<MockCustomer>;
    const now = new Date().toISOString();
    const created: MockCustomer = {
      id: nextId++,
      enterpriseId: 1,
      name: body.name ?? "",
      phone: body.phone ?? null,
      remark: body.remark ?? null,
      createdAt: now,
      updatedAt: now,
    };
    seed.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch("*/api/v1/crm/customers/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as Partial<MockCustomer>;
    const idx = seed.findIndex((c) => c.id === id);
    if (idx === -1) {
      return HttpResponse.json({ message: "Not found" }, { status: 404 });
    }
    seed[idx] = {
      ...seed[idx],
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(seed[idx]);
  }),

  http.delete("*/api/v1/crm/customers/:id", ({ params }) => {
    const id = Number(params.id);
    const idx = seed.findIndex((c) => c.id === id);
    if (idx === -1) {
      return HttpResponse.json({ message: "Not found" }, { status: 404 });
    }
    seed.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),
];
