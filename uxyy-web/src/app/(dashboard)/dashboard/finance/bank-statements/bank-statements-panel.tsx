"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBankStatements,
  fetchSupportedBanks,
  importBankStatement,
  matchBankStatement,
  batchMatchBankStatements,
  generateVoucherFromStatement,
  type BankStatementResponseDto,
  type BankStatementMatchStatus,
  getMatchStatusLabel,
  getMatchStatusColor,
} from "@/lib/api/bank-statement";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bank, Upload, ArrowsClockwise, FileText, CheckCircle } from "@phosphor-icons/react";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

export function BankStatementsPanel() {
  const [page, setPage] = useState(1);
  const [matchStatus, setMatchStatus] = useState<string>("");
  const [bankAccount, setBankAccount] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const qc = useQueryClient();
  const pageSize = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bank-statements", page, matchStatus, bankAccount],
    queryFn: () =>
      fetchBankStatements({
        page,
        pageSize,
        matchStatus: matchStatus || undefined,
        bankAccount: bankAccount || undefined,
      }),
  });

  const { data: banks } = useQuery({
    queryKey: ["supported-banks"],
    queryFn: fetchSupportedBanks,
  });

  const importMutation = useMutation({
    mutationFn: importBankStatement,
    onSuccess: (res) => {
      toast.success(`导入成功：${res.importedRows} 条记录`);
      setImportOpen(false);
      setCsvContent("");
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "导入失败");
    },
  });

  const matchMutation = useMutation({
    mutationFn: matchBankStatement,
    onSuccess: () => {
      toast.success("匹配成功");
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "匹配失败");
    },
  });

  const batchMatchMutation = useMutation({
    mutationFn: batchMatchBankStatements,
    onSuccess: (res) => {
      toast.success(`批量匹配完成：${res.length} 条记录`);
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "批量匹配失败");
    },
  });

  const generateVoucherMutation = useMutation({
    mutationFn: ({ id, accountId }: { id: number; accountId?: number }) =>
      generateVoucherFromStatement(id, accountId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("凭证生成成功");
        qc.invalidateQueries({ queryKey: ["bank-statements"] });
      } else {
        toast.error(res.message || "凭证生成失败");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "凭证生成失败");
    },
  });

  const statements = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleImport = () => {
    if (!selectedBank || !accountNumber || !csvContent.trim()) {
      toast.error("请填写银行、账号并粘贴CSV内容");
      return;
    }
    importMutation.mutate({
      bankCode: selectedBank,
      bankAccount: accountNumber,
      csvContent: csvContent.trim(),
      hasHeader: true,
    });
  };

  const formatAmount = (amount: string, type: string) => {
    const num = parseFloat(amount);
    const sign = type === "expense" ? "-" : type === "income" ? "+" : "";
    return `${sign}¥${num.toFixed(2)}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">银行流水</h1>
          <p className="mt-1 text-sm text-text-secondary">
            导入对公账户流水，自动匹配生成凭证
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => batchMatchMutation.mutate()}
            disabled={batchMatchMutation.isPending}
          >
            <ArrowsClockwise
              className={`mr-2 h-4 w-4 ${batchMatchMutation.isPending ? "animate-spin" : ""}`}
            />
            批量匹配
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            导入流水
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">匹配状态：</span>
            <select
              className={selectCls}
              value={matchStatus}
              onChange={(e) => {
                setMatchStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部</option>
              <option value="unmatched">未匹配</option>
              <option value="matched">已匹配</option>
              <option value="ignored">已忽略</option>
              <option value="voucher_created">已生成凭证</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">银行账号：</span>
            <Input
              placeholder="输入银行账号筛选"
              value={bankAccount}
              onChange={(e) => {
                setBankAccount(e.target.value);
                setPage(1);
              }}
              className="w-48"
            />
          </div>
        </div>
      </Card>

      {/* 数据表格 */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center text-danger">
            加载失败
          </div>
        ) : statements.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <Bank className="h-12 w-12 text-text-tertiary" />
            <p className="text-text-secondary">暂无银行流水记录</p>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              导入流水
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    交易日期
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    银行
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    对方户名
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    摘要
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">
                    金额
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    状态
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-text-secondary">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {statements.map((item) => (
                  <tr key={item.id} className="hover:bg-bg-secondary/50">
                    <td className="px-4 py-3 text-text-primary">
                      {item.transactionDate}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {item.bankName}
                      <div className="text-xs text-text-tertiary">
                        {item.bankAccount}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {item.counterpartyName || "-"}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {item.summary}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        item.transactionType === "income"
                          ? "text-success"
                          : item.transactionType === "expense"
                          ? "text-danger"
                          : "text-text-primary"
                      }`}
                    >
                      {formatAmount(item.amount, item.transactionType)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getMatchStatusColor(
                          item.matchStatus
                        )}`}
                      >
                        {getMatchStatusLabel(item.matchStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.matchStatus === "unmatched" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => matchMutation.mutate(item.id)}
                            disabled={matchMutation.isPending}
                          >
                            <ArrowsClockwise className="h-4 w-4" />
                          </Button>
                        )}
                        {item.matchStatus === "matched" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              generateVoucherMutation.mutate({
                                id: item.id,
                                accountId: item.suggestedAccountId,
                              })
                            }
                            disabled={generateVoucherMutation.isPending}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-primary px-4 py-3">
            <div className="text-sm text-text-secondary">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 导入对话框 */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导入银行流水</DialogTitle>
            <DialogDescription>
              选择银行并粘贴CSV格式的银行流水数据
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  选择银行
                </label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择银行" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks?.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  银行账号
                </label>
                <Input
                  placeholder="请输入银行账号"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                CSV 数据
              </label>
              <textarea
                className="min-h-[200px] w-full rounded-md border border-border-primary bg-bg-secondary p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                placeholder="请粘贴从银行导出的CSV格式流水数据..."
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
              />
              <p className="text-xs text-text-tertiary">
                支持大多数银行的CSV格式导出文件，请确保包含表头行
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importMutation.isPending ||
                !selectedBank ||
                !accountNumber ||
                !csvContent.trim()
              }
            >
              {importMutation.isPending ? (
                <ArrowsClockwise className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
