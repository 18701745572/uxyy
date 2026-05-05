import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function CrmOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">客户管理</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/crm/customers">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <h2 className="font-medium text-zinc-900">客户列表</h2>
            <p className="mt-1 text-sm text-zinc-600">
              查看、搜索、管理全部客户档案
            </p>
          </Card>
        </Link>

        <Card>
          <h2 className="font-medium text-zinc-400">商机管理</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>

        <Card>
          <h2 className="font-medium text-zinc-400">跟进记录</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>

        <Card>
          <h2 className="font-medium text-zinc-400">客户分类</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
      </div>
    </div>
  );
}
