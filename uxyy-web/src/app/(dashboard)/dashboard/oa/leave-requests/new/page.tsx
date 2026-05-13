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
import { ArrowLeft, Calendar, Spinner } from "@/components/icons";
import { toast } from "sonner";
import { toastSubmitted } from "@/lib/ui/toast-feedback";
import { createLeaveRequest } from "@/lib/api/leave-requests";
import { ApiError } from "@/lib/api/client";

const leaveTypes = [
  { value: "事假", label: "事假" },
  { value: "病假", label: "病假" },
  { value: "年假", label: "年假" },
  { value: "婚假", label: "婚假" },
  { value: "产假", label: "产假" },
  { value: "丧假", label: "丧假" },
  { value: "调休", label: "调休" },
];

export default function NewLeaveRequestPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    startDate: "",
    endDate: "",
    days: "",
    reason: "",
  });

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays.toString() : "";
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const newFormData = { ...formData, [field]: value };
    const days = calculateDays(newFormData.startDate, newFormData.endDate);
    setFormData({ ...newFormData, days });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createLeaveRequest({
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: String(formData.days).trim(),
        ...(formData.reason.trim() ? { reason: formData.reason.trim() } : {}),
      });
      await qc.invalidateQueries({ queryKey: ["oa", "leave-requests"] });
      toastSubmitted("请假申请");
      router.push("/dashboard/oa/leave-requests");
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
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/oa/leave-requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">请假申请</h1>
          <p className="text-text-tertiary mt-1">填写请假信息并提交审批</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-text-tertiary" />
              请假信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 请假类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">
                请假类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择请假类型" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 请假日期 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  开始日期 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    handleDateChange("startDate", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  结束日期 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleDateChange("endDate", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 请假天数 */}
            <div className="space-y-2">
              <Label htmlFor="days">
                请假天数 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="days"
                type="number"
                step="0.5"
                min="0.5"
                value={formData.days}
                onChange={(e) =>
                  setFormData({ ...formData, days: e.target.value })
                }
                placeholder="系统自动计算，也可手动调整"
                required
              />
              <p className="text-xs text-text-tertiary">
                支持0.5天为单位，如请假半天请输入0.5
              </p>
            </div>

            {/* 请假原因 */}
            <div className="space-y-2">
              <Label htmlFor="reason">请假原因</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="请简要说明请假原因（可选）"
                rows={4}
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4 pt-4">
              <Link href="/dashboard/oa/leave-requests" className="flex-1">
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
