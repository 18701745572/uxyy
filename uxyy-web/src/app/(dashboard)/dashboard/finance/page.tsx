import { Card } from "@/components/ui/card";

export default function FinancePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">财务</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-medium text-zinc-400">发票管理</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">凭证录入</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">应收应付</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">财务报表</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
      </div>
    </div>
  );
}
