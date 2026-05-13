"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Receipt, Spinner } from "@/components/icons";
import { toast } from "sonner";
import { toastSubmitted } from "@/lib/ui/toast-feedback";
import { createExpenseRequest } from "@/lib/api/expense-requests";
import { ApiError } from "@/lib/api/client";

const expenseTypes = [
  { value: "差旅费", label: "差旅费" },
  { value: "办公费", label: "办公费" },
  { value: "招待费", label: "招待费" },
  { value: "通讯费", label: "通讯费" },
  { value: "交通费", label: "交通费" },
  { value: "培训费", label: "培训费" },
  { value: "其他", label: "其他" },
];

export default function NewExpenseRequestPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amt = Number(formData.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error("请输入有效金额");
        return;
      }
      await createExpenseRequest({
        type: formData.type,
        amount: amt.toFixed(2),
        ...(formData.description.trim()
          ? { description: formData.description.trim() }
          : {}),
      });
      await qc.invalidateQueries({ queryKey: ["oa", "expense-requests"] });
      toastSubmitted("报销申请");
      router.push("/dashboard/oa/expense-requests");
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "提交失败";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/oa/expense-requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">报销申请</h1>
          <p className="text-text-tertiary mt-1">填写报销信息（附件 URL 上传待对接）</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-text-tertiary" />
              报销信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">
                报销类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                required
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择报销类型" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                报销金额 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                  ¥
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="请输入报销金额"
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">报销说明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="请简要说明报销事由（可选）"
                rows={4}
              />
            </div>

            <div className="rounded-md border border-dashed border-border-primary bg-bg-secondary/80 px-3 py-3 text-xs text-text-secondary">
              凭证附件：当前版本提交时<strong>不附带</strong>图片；后端字段已预留，后续可对接对象存储后在此补充。
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/dashboard/oa/expense-requests" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  取消
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  "提交申请"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
