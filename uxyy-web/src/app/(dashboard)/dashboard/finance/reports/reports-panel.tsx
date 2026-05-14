"use client";

import { type ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchArAp,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchDashboard,
  fetchIncomeStatement,
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
  type ReportLineItem,
} from "@/lib/api/reports";
import { ApiErrorCallout } from "@/components/ui/api-error-callout";
import {
  DashboardOperationCharts,
  IncomeStatementStructureChart,
} from "@/components/finance/charts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

type ReportType =
  | "dashboard"
  | "balance-sheet"
  | "income-statement"
  | "cash-flow"
  | "ar-ap";

function LineItemsTable({
  title,
  items,
  totalLabel,
  totalAmount,
}: {
  title: string;
  items: ReportLineItem[];
  totalLabel?: string;
  totalAmount?: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary py-2">无发生额或未匹配科目</p>
      ) : (
        <div className="overflow-x-auto border border-border-secondary rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left">科目编码</th>
                <th className="px-3 py-2 text-left">科目名称</th>
                <th className="px-3 py-2 text-right">金额</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {items.map((row) => (
                <tr key={`${row.code}-${row.name}`}>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    ¥{row.amount}
                  </td>
                </tr>
              ))}
              {totalLabel !== undefined && totalAmount !== undefined ? (
                <tr className="bg-bg-secondary font-medium">
                  <td className="px-3 py-2" colSpan={2}>
                    {totalLabel}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    ¥{totalAmount}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BalanceSheetView({ data }: { data: BalanceSheetData }) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-text-tertiary">
        截止日期（含）：<strong>{data.period}</strong> ·
        按企业科目表与截止日前凭证汇总借贷差（子目命名「父科目-子目」归入父科目）
      </p>
      <LineItemsTable
        title="资产"
        items={data.assets}
        totalLabel="资产合计"
        totalAmount={data.totalAssets}
      />
      <LineItemsTable
        title="负债"
        items={data.liabilities}
        totalLabel="负债合计"
        totalAmount={data.totalLiabilities}
      />
      <LineItemsTable
        title="所有者权益"
        items={data.equity}
        totalLabel="权益合计"
        totalAmount={data.totalEquity}
      />
    </div>
  );
}

function IncomeStatementView({ data }: { data: IncomeStatementData }) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-text-tertiary">
        会计期间：<strong>{data.period}</strong> · 营业收入取收入类科目的贷方；成本/费用区分见 PRD
        §2.5.5
      </p>
      <IncomeStatementStructureChart data={data} />
      <LineItemsTable
        title="营业收入"
        items={data.revenue}
        totalLabel="收入小计"
        totalAmount={data.totalRevenue}
      />
      <LineItemsTable
        title="营业成本"
        items={data.costs}
        totalLabel="成本小计"
        totalAmount={data.totalCosts}
      />
      <LineItemsTable
        title="期间费用"
        items={data.expenses}
        totalLabel="费用小计"
        totalAmount={data.totalExpenses}
      />
      <div className="flex justify-between items-center rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-sm font-medium">
        <span>净利润（收入 − 成本 − 费用）</span>
        <span
          className={
            Number(data.netProfit) < 0
              ? "text-red-600 tabular-nums"
              : "text-emerald-700 tabular-nums"
          }
        >
          ¥{data.netProfit}
        </span>
      </div>
    </div>
  );
}

function CashFlowView({ data }: { data: CashFlowData }) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-text-tertiary rounded-md bg-amber-50 border border-amber-100 px-3 py-2">
        <strong>MVP 简版</strong>：
        「现金流入」= 借方记在银行存款 / 库存现金；「现金流出」= 贷方记在银行存款 / 库存现金。不涉及直接法逐项还原，投资 / 筹资活动本期可为
        0。
      </p>
      <LineItemsTable title="经营活动" items={data.operatingActivities} />
      <div className="flex justify-between text-sm px-3 py-2 bg-bg-secondary rounded-md">
        <span>经营活动现金流量净额</span>
        <span className="tabular-nums font-medium">
          ¥{data.netOperatingCashFlow}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-text-secondary">
        <div className="p-3 border border-border-secondary rounded-md">
          <span className="font-medium text-text-primary">筹资活动净额</span>
          <p className="mt-1 tabular-nums">
            ¥{data.netFinancingCashFlow}（占位）
          </p>
        </div>
        <div className="p-3 border border-border-secondary rounded-md">
          <span className="font-medium text-text-primary">投资活动净额</span>
          <p className="mt-1 tabular-nums">
            ¥{data.netInvestingCashFlow}（占位）
          </p>
        </div>
        <div className="p-3 border border-border-secondary rounded-md">
          <span className="font-medium text-text-primary">现金流量净增加</span>
          <p className="mt-1 tabular-nums font-semibold">
            ¥{data.netCashFlow}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReportsPanel() {
  const [activeTab, setActiveTab] = useState<ReportType>("dashboard");
  const [period, setPeriod] = useState("month");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 7));
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  const dashboardQuery = useQuery({
    queryKey: ["finance", "reports", "dashboard", period, date],
    queryFn: () => fetchDashboard(period, date),
    enabled: activeTab === "dashboard",
  });

  const balanceQuery = useQuery({
    queryKey: ["finance", "reports", "balance-sheet", asOfDate],
    queryFn: () => fetchBalanceSheet(asOfDate),
    enabled: activeTab === "balance-sheet",
  });

  const incomeQuery = useQuery({
    queryKey: ["finance", "reports", "income-statement", date],
    queryFn: () => fetchIncomeStatement(date),
    enabled: activeTab === "income-statement",
  });

  const cashFlowQuery = useQuery({
    queryKey: ["finance", "reports", "cash-flow", date],
    queryFn: () => fetchCashFlow(date),
    enabled: activeTab === "cash-flow",
  });

  const arApQuery = useQuery({
    queryKey: ["finance", "reports", "ar-ap"],
    queryFn: fetchArAp,
    enabled: activeTab === "ar-ap",
  });

  const tabs = [
    { key: "dashboard" as const, label: "经营仪表盘" },
    { key: "balance-sheet" as const, label: "资产负债表" },
    { key: "income-statement" as const, label: "利润表" },
    { key: "cash-flow" as const, label: "现金流量表" },
    { key: "ar-ap" as const, label: "应收应付" },
  ];

  function renderLoadingOrError(
    q: {
      isLoading: boolean;
      isError: boolean;
      error: unknown;
      isFetching: boolean;
      refetch: () => unknown;
    },
    title?: string,
  ): ReactNode {
    if (q.isLoading) {
      return <p className="text-sm text-text-secondary">加载中…</p>;
    }
    if (q.isError) {
      return (
        <ApiErrorCallout
          title={title ?? "加载失败"}
          error={q.error}
          onRetry={() => void q.refetch()}
          retrying={q.isFetching}
        />
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-text-primary">财务报表</h1>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "primary" : "secondary"}
            className="text-sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <div className="flex gap-2">
          <select
            className={selectCls}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="month">按月</option>
            <option value="quarter">按季</option>
            <option value="year">按年</option>
          </select>
          <input
            type="month"
            className="rounded-md border border-border-primary px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      )}

      {activeTab === "balance-sheet" && (
        <div className="flex gap-2 items-center">
          <label className="text-sm text-text-secondary">截止日期</label>
          <input
            type="date"
            className="rounded-md border border-border-primary px-3 py-2 text-sm"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </div>
      )}

      {(activeTab === "income-statement" || activeTab === "cash-flow") && (
        <div className="flex gap-2 items-center">
          <label className="text-sm text-text-secondary">会计月度</label>
          <input
            type="month"
            className="rounded-md border border-border-primary px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      )}

      <Card className="p-4">
        {activeTab === "dashboard" && (
          <>
            {dashboardQuery.isLoading ? (
              <p className="text-sm text-text-secondary">加载中…</p>
            ) : dashboardQuery.isError ? (
              <ApiErrorCallout
                error={dashboardQuery.error}
                onRetry={() => void dashboardQuery.refetch()}
                retrying={dashboardQuery.isFetching}
              />
            ) : dashboardQuery.data ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-bg-secondary rounded-lg">
                    <p className="text-xs text-text-tertiary">销售金额</p>
                    <p className="text-lg font-semibold text-text-primary">
                      ¥{dashboardQuery.data.salesAmount}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {dashboardQuery.data.salesOrderCount} 单
                    </p>
                  </div>
                  <div className="p-4 bg-bg-secondary rounded-lg">
                    <p className="text-xs text-text-tertiary">采购金额</p>
                    <p className="text-lg font-semibold text-text-primary">
                      ¥{dashboardQuery.data.purchaseAmount}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {dashboardQuery.data.purchaseOrderCount} 单
                    </p>
                  </div>
                  <div className="p-4 bg-bg-secondary rounded-lg">
                    <p className="text-xs text-text-tertiary">毛利润</p>
                    <p className="text-lg font-semibold text-green-600">
                      ¥{dashboardQuery.data.grossProfit}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      毛利率 {dashboardQuery.data.grossProfitRate}
                    </p>
                  </div>
                  <div className="p-4 bg-bg-secondary rounded-lg">
                    <p className="text-xs text-text-tertiary">应收/应付（示意）</p>
                    <p className="text-sm font-medium text-blue-600">
                      应收: ¥{dashboardQuery.data.pendingReceivable}
                    </p>
                    <p className="text-sm font-medium text-orange-600">
                      应付: ¥{dashboardQuery.data.pendingPayable}
                    </p>
                  </div>
                </div>

                <DashboardOperationCharts data={dashboardQuery.data} />

                {(dashboardQuery.data.lowStockProducts?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-text-primary mb-2">
                      库存预警
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-bg-secondary">
                          <tr>
                            <th className="px-3 py-2 text-left">商品</th>
                            <th className="px-3 py-2 text-right">当前库存</th>
                            <th className="px-3 py-2 text-right">最低库存</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-secondary">
                          {dashboardQuery.data.lowStockProducts.map((p) => (
                            <tr key={p.productId}>
                              <td className="px-3 py-2">{p.productName}</td>
                              <td className="px-3 py-2 text-right text-red-600">
                                {p.stockQty}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {p.minStock}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {(dashboardQuery.data.topSalesProducts?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-text-primary mb-2">
                      热销商品
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-bg-secondary">
                          <tr>
                            <th className="px-3 py-2 text-left">商品</th>
                            <th className="px-3 py-2 text-right">销量</th>
                            <th className="px-3 py-2 text-right">销售额</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-secondary">
                          {dashboardQuery.data.topSalesProducts.map((p) => (
                            <tr key={p.productId}>
                              <td className="px-3 py-2">{p.productName}</td>
                              <td className="px-3 py-2 text-right">
                                {p.salesQty}
                              </td>
                              <td className="px-3 py-2 text-right">
                                ¥{p.salesAmount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">暂无数据</p>
            )}
          </>
        )}

        {activeTab === "balance-sheet" && (
          <>
            {renderLoadingOrError(balanceQuery, "资产负债表加载失败")}
            {balanceQuery.data ? (
              <BalanceSheetView data={balanceQuery.data} />
            ) : null}
          </>
        )}

        {activeTab === "income-statement" && (
          <>
            {renderLoadingOrError(incomeQuery, "利润表加载失败")}
            {incomeQuery.data ? (
              <IncomeStatementView data={incomeQuery.data} />
            ) : null}
          </>
        )}

        {activeTab === "cash-flow" && (
          <>
            {renderLoadingOrError(cashFlowQuery, "现金流量表加载失败")}
            {cashFlowQuery.data ? (
              <CashFlowView data={cashFlowQuery.data} />
            ) : null}
          </>
        )}

        {activeTab === "ar-ap" && (
          <>
            {arApQuery.isLoading ? (
              <p className="text-sm text-text-secondary">加载中…</p>
            ) : arApQuery.isError ? (
              <ApiErrorCallout
                error={arApQuery.error}
                title="应收应付加载失败"
                onRetry={() => void arApQuery.refetch()}
                retrying={arApQuery.isFetching}
              />
            ) : arApQuery.data ? (
              <div className="space-y-6">
                <p className="text-xs text-text-tertiary rounded-md bg-bg-secondary border border-border-secondary px-3 py-2">
                  MVP：基于「已验证、未入账」发票；应收剔除{" "}
                  <code className="text-xs">purchase_order</code>{" "}
                  采购来源，应付仅限采购发票。核销与对账导出见 PRD 后续迭代。
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">应收账款合计</p>
                    <p className="text-lg font-semibold text-blue-700">
                      ¥{arApQuery.data.totalReceivables}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-600">应付账款合计</p>
                    <p className="text-lg font-semibold text-orange-700">
                      ¥{arApQuery.data.totalPayables}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-2">
                    应收账款明细
                  </h3>
                  {(arApQuery.data.receivables?.length ?? 0) > 0 ? (
                    <table className="w-full text-sm border border-border-secondary rounded-md overflow-hidden">
                      <thead className="bg-bg-secondary">
                        <tr>
                          <th className="px-3 py-2 text-left">客户（购方）</th>
                          <th className="px-3 py-2 text-left">发票号</th>
                          <th className="px-3 py-2 text-right">余额</th>
                          <th className="px-3 py-2 text-right">逾期天数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-secondary">
                        {arApQuery.data.receivables.map((r) => (
                          <tr key={r.id}>
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {r.invoiceNo}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ¥{r.balance}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.daysOverdue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-text-tertiary">暂无应收账款</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-2">
                    应付账款明细
                  </h3>
                  {(arApQuery.data.payables?.length ?? 0) > 0 ? (
                    <table className="w-full text-sm border border-border-secondary rounded-md overflow-hidden">
                      <thead className="bg-bg-secondary">
                        <tr>
                          <th className="px-3 py-2 text-left">
                            供应商（销方）
                          </th>
                          <th className="px-3 py-2 text-left">发票号</th>
                          <th className="px-3 py-2 text-right">余额</th>
                          <th className="px-3 py-2 text-right">逾期天数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-secondary">
                        {arApQuery.data.payables.map((r) => (
                          <tr key={r.id}>
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {r.invoiceNo}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ¥{r.balance}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.daysOverdue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-text-tertiary">暂无应付账款</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">暂无数据</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
