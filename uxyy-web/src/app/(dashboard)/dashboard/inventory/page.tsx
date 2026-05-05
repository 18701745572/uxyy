import { Card } from "@/components/ui/card";

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">进销存</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-medium text-zinc-400">商品管理</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">采购订单</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">销售订单</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">库存预警</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
      </div>
    </div>
  );
}
