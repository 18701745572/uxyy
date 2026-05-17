"use client";

import { useQuery } from "@tanstack/react-query";
import { CurrencyDollar, ShoppingCart, Warning } from "@phosphor-icons/react";
import { getDashboardOverview } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface OverviewCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  loading?: boolean;
}

function OverviewCard({ title, value, icon, loading }: OverviewCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-primary p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/10">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function OverviewCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <OverviewCard
        title="今日销售额"
        value={data ? formatCurrency(Number(data.todaySales)) : "¥0.00"}
        icon={<CurrencyDollar className="h-5 w-5 text-accent-blue" weight="fill" />}
        loading={isLoading}
      />
      <OverviewCard
        title="待处理订单"
        value={data?.pendingOrders ?? 0}
        icon={<ShoppingCart className="h-5 w-5 text-accent-purple" weight="fill" />}
        loading={isLoading}
      />
      <OverviewCard
        title="库存预警"
        value={data?.stockAlerts ?? 0}
        icon={<Warning className="h-5 w-5 text-amber-500" weight="fill" />}
        loading={isLoading}
      />
    </div>
  );
}
