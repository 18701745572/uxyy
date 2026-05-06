import Link from "next/link";
import { Card } from "@/components/ui/card";

const modules = [
  {
    title: "发票管理",
    desc: "管理发票信息、核验、入账",
    href: "/dashboard/finance/invoices",
    status: "available",
  },
  {
    title: "凭证录入",
    desc: "创建和管理会计凭证",
    href: "/dashboard/finance/vouchers",
    status: "available",
  },
  {
    title: "财务报表",
    desc: "查看财务报表和经营分析",
    href: "/dashboard/finance/reports",
    status: "available",
  },
  {
    title: "应收应付",
    desc: "管理应收应付账款（已核验未入账发票）",
    href: "/dashboard/finance/ar-ap",
    status: "available",
  },
];

export default function FinancePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">财务</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) =>
          m.status === "available" ? (
            <Link key={m.title} href={m.href}>
              <Card className="h-full hover:border-zinc-400 transition-colors cursor-pointer">
                <h2 className="font-medium text-zinc-900">{m.title}</h2>
                <p className="mt-1 text-sm text-zinc-500">{m.desc}</p>
              </Card>
            </Link>
          ) : (
            <Card key={m.title} className="h-full opacity-60">
              <h2 className="font-medium text-zinc-400">{m.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">即将上线</p>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
