import Link from "next/link";
import { Card } from "@/components/ui/card";

const modules = [
  {
    title: "商品管理",
    desc: "管理商品信息、库存、价格",
    href: "/dashboard/inventory/products",
    status: "available",
  },
  {
    title: "供应商管理",
    desc: "管理供应商信息",
    href: "/dashboard/inventory/suppliers",
    status: "available",
  },
  {
    title: "采购订单",
    desc: "创建和管理采购订单",
    href: "/dashboard/inventory/purchase-orders",
    status: "available",
  },
  {
    title: "销售订单",
    desc: "创建和管理销售订单",
    href: "/dashboard/inventory/sales-orders",
    status: "available",
  },
  {
    title: "库存盘点",
    desc: "库存盘点管理",
    href: "/dashboard/inventory/stocktaking",
    status: "available",
  },
  {
    title: "库存预警",
    desc: "查看库存预警信息",
    href: "/dashboard/inventory/stock-alerts",
    status: "available",
  },
];

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">进销存</h1>

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
