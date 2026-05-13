"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWarehouse,
  fetchWarehouses,
  type CreateWarehousePayload,
} from "@/lib/api/warehouses";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function buildCreatePayload(values: {
  name: string;
  code: string;
  address: string;
  phone: string;
  remark: string;
  isDefault: boolean;
}): CreateWarehousePayload {
  const name = values.name.trim();
  const code = values.code.trim();
  const address = values.address.trim();
  const phone = values.phone.trim();
  const remark = values.remark.trim();
  return {
    name,
    ...(code ? { code } : {}),
    ...(address ? { address } : {}),
    ...(phone ? { phone } : {}),
    ...(remark ? { remark } : {}),
    ...(values.isDefault ? { isDefault: true } : {}),
  };
}

export function WarehousesPanel() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [remark, setRemark] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [formError, setFormError] = useState("");

  const q = useQuery({
    queryKey: ["inventory", "warehouses", "listing"],
    queryFn: () => fetchWarehouses(),
  });

  const rows = q.data ?? [];

  useEffect(() => {
    if (createOpen) {
      setIsDefault(rows.length === 0);
    }
  }, [createOpen, rows.length]);

  const createMut = useMutation({
    mutationFn: () => {
      const payload = buildCreatePayload({
        name,
        code,
        address,
        phone,
        remark,
        isDefault,
      });
      if (!payload.name) {
        return Promise.reject(new Error("请填写仓库名称"));
      }
      return createWarehouse(payload);
    },
    onSuccess: async () => {
      setFormError("");
      setCreateOpen(false);
      setName("");
      setCode("");
      setAddress("");
      setPhone("");
      setRemark("");
      await qc.invalidateQueries({ queryKey: ["inventory", "warehouses"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setFormError(err.message);
      else if (err instanceof Error) setFormError(err.message);
      else setFormError("创建失败");
    },
  });

  const onOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setFormError("");
      createMut.reset();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">仓库管理</h1>
          <p className="mt-1 text-sm text-text-secondary">
            数据来自后端 GET /inventory/warehouses ，与盘点、库存明细中的
            warehouseId 对应。
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" variant="primary" className="shrink-0">
              新建仓库
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建仓库</DialogTitle>
              <DialogDescription>
                创建后可在盘点、出入库等流程中选择该仓库。
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError("");
                createMut.mutate();
              }}
            >
              <Input
                label="仓库名称"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：主仓库"
                maxLength={100}
              />
              <Input
                label="编码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="可选，内部编号"
                maxLength={50}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">地址</label>
                <textarea
                  className="rounded-md border border-border-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="可选"
                />
              </div>
              <Input
                label="联系电话"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="可选"
                maxLength={20}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">备注</label>
                <textarea
                  className="rounded-md border border-border-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="可选"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                设为默认仓库（同一企业仅能有一个默认）
              </label>
              {formError && (
                <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
                  {formError}
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-0 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button type="submit" loading={createMut.isPending}>
                  创建
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        {q.isLoading ? (
          <p className="text-sm text-text-secondary p-6">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700 p-6">
            {q.error instanceof Error ? q.error.message : String(q.error)}
          </pre>
        ) : rows.length === 0 ? (
          <p className="p-8 text-sm text-text-secondary">
            当前企业尚无仓库档案。可点击顶部「新建仓库」，或在项目 uxyy-api 下执行一次{" "}
            <code className="text-xs bg-bg-tertiary px-1 rounded">pnpm db:seed</code>{" "}
            自动写入「主仓库」。
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border-secondary">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  ID
                </th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  名称
                </th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  编码
                </th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  默认
                </th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  SKU 数
                </th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  总量
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {rows.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-2">{w.id}</td>
                  <td className="px-4 py-2 font-medium text-text-primary">{w.name}</td>
                  <td className="px-4 py-2 text-text-secondary">{w.code ?? "—"}</td>
                  <td className="px-4 py-2">{w.isDefault ? "是" : "—"}</td>
                  <td className="px-4 py-2">{w.productCount ?? "—"}</td>
                  <td className="px-4 py-2">{w.totalQuantity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
