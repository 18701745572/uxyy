import Link from "next/link";
import { Card } from "@/components/ui/card";

const modules = [
  {
    href: "/dashboard/crm",
    label: "客户管理",
    desc: "客户档案、跟进记录、商机管理",
    icon: "👥",
  },
  {
    href: "/dashboard/inventory",
    label: "进销存",
    desc: "商品、采购、销售、库存预警",
    icon: "📦",
  },
  {
    href: "/dashboard/finance",
    label: "财务",
    desc: "发票、凭证、应收应付、报表",
    icon: "💰",
  },
  {
    href: "/dashboard/ai",
    label: "AI 智能",
    desc: "OCR 识别、智能记账建议",
    icon: "🤖",
  },
];

export default function DashboardHome() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">欢迎使用优效营</h1>
        <p className="mt-1 text-sm text-zinc-600">
          小微企业一体化经营系统 · MVP
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {mod.icon}
                </span>
                <div>
                  <h2 className="font-medium text-zinc-900">{mod.label}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{mod.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
