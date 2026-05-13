"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  checkIn,
  getPersonalAttendance,
  getEnterpriseOverview,
  requestMakeUp,
  fetchMyMakeUpRequests,
  type AttendanceRecord,
  type MakeUpRequestListItem,
} from "@/lib/api/attendance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, WarningCircle, CheckCircle, XCircle, ClipboardText, Users, TrendUp, ArrowsClockwise } from "@/components/icons";
import { useAuthStore } from "@/stores/auth-store";
import { Permission } from "@/lib/permissions/role-matrix";

function getStatusColor(status: AttendanceRecord["status"]): string {
  switch (status) {
    case "normal":
      return "bg-green-100 text-green-700";
    case "late":
      return "bg-amber-100 text-amber-700";
    case "early_leave":
      return "bg-orange-100 text-orange-700";
    case "absent":
      return "bg-red-100 text-red-700";
    case "leave":
      return "bg-blue-100 text-blue-700";
    case "overtime":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-bg-tertiary text-text-secondary";
  }
}

function getStatusIcon(status: AttendanceRecord["status"]) {
  switch (status) {
    case "normal":
      return <CheckCircle className="w-4 h-4" />;
    case "late":
      return <Clock className="w-4 h-4" />;
    case "early_leave":
      return <Clock className="w-4 h-4" />;
    case "absent":
      return <XCircle className="w-4 h-4" />;
    case "leave":
      return <ClipboardText className="w-4 h-4" />;
    case "overtime":
      return <TrendUp className="w-4 h-4" />;
    default:
      return <WarningCircle className="w-4 h-4" />;
  }
}

function getStatusName(status: AttendanceRecord["status"]): string {
  switch (status) {
    case "normal":
      return "正常";
    case "late":
      return "迟到";
    case "early_leave":
      return "早退";
    case "absent":
      return "缺勤";
    case "leave":
      return "请假";
    case "overtime":
      return "加班";
    default:
      return "未知";
  }
}

function formatTime(isoString?: string): string {
  if (!isoString) return "--:--";
  const date = new Date(isoString);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getMonth() + 1}/${date.getDate()} ${weekDays[date.getDay()]}`;
}

function makeUpStatusTone(s: MakeUpRequestListItem["status"]): string {
  switch (s) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-bg-tertiary text-text-secondary";
  }
}

function makeUpStatusLabel(s: MakeUpRequestListItem["status"]): string {
  switch (s) {
    case "pending":
      return "待审批";
    case "approved":
      return "已通过";
    case "rejected":
      return "已驳回";
    default:
      return s;
  }
}

function formatMakeUpDay(isoDate: string): string {
  const d = new Date(isoDate);
  if (!Number.isFinite(d.getTime())) return isoDate;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMakeUpType(t: "in" | "out"): string {
  return t === "in" ? "上班打卡" : "下班打卡";
}

function formatDateTimeCn(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWorkHours(raw: unknown): string {
  const n =
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

export function AttendancePanel() {
  const [activeTab, setActiveTab] = useState<"personal" | "enterprise" | "make-up">("personal");
  const [makeUpDate, setMakeUpDate] = useState("");
  const [makeUpType, setMakeUpType] = useState<"in" | "out">("in");
  const [makeUpReason, setMakeUpReason] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [checkInType, setCheckInType] = useState<"in" | "out">("in");
  const [lastCheckInTime, setLastCheckInTime] = useState("");
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.permissions);
  const canApproveAttendance = permissions.includes(Permission.OA_APPROVE);

  const personalQuery = useQuery({
    queryKey: ["attendance", "personal"],
    queryFn: () => getPersonalAttendance(),
    retry: 1,
  });

  const enterpriseQuery = useQuery({
    queryKey: ["attendance", "enterprise"],
    queryFn: () => getEnterpriseOverview(),
    retry: 1,
  });

  const myMakeUpQuery = useQuery({
    queryKey: ["attendance", "make-up-requests", "mine"],
    queryFn: fetchMyMakeUpRequests,
    enabled: activeTab === "make-up",
    retry: 1,
  });

  const checkInMutation = useMutation({
    mutationFn: (type: "in" | "out") => checkIn(type),
    onSuccess: (_data, variables) => {
      setCheckInType(variables);
      setLastCheckInTime(new Date().toLocaleTimeString("zh-CN"));
      setShowSuccessDialog(true);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const makeUpMutation = useMutation({
    mutationFn: () => requestMakeUp(makeUpDate, makeUpType, makeUpReason),
    onSuccess: () => {
      setMakeUpDate("");
      setMakeUpReason("");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const tabs = [
    { id: "personal", label: "我的考勤", icon: ClipboardText },
    { id: "enterprise", label: "企业概览", icon: Users },
    { id: "make-up", label: "补卡申请", icon: Clock },
  ] as const;

  const todayRecord = personalQuery.data?.records.find((r) => {
    const today = new Date().toISOString().split("T")[0];
    return r.date.startsWith(today);
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSuccessDialog(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [showSuccessDialog]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-text-secondary" />
          <h1 className="text-lg font-semibold text-text-primary">考勤管理</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="hidden sm:flex">
            <ArrowsClockwise className={`w-4 h-4 ${personalQuery.isRefetching ? "animate-spin" : ""}`} />
          </Button>
          {canApproveAttendance ? (
            <Link href="/dashboard/oa/attendance/make-up-approvals">
              <Button variant="secondary" size="sm">
                补卡审批
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "primary" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              size="sm"
              className={`gap-2 rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white shadow-sm text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <Card className="p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary to-transparent opacity-50" />
        
        <div className="relative">
          <p className="text-sm text-text-secondary mb-6">
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>

          {checkInMutation.status === "pending" ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center">
                  <Spinner className="w-10 h-10 text-text-secondary" />
                </div>
                <div className="absolute inset-0 rounded-full bg-bg-tertiary animate-ping opacity-50" />
              </div>
              <p className="text-sm text-text-secondary">正在打卡...</p>
            </div>
          ) : todayRecord?.checkIn && todayRecord?.checkOut ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center transform transition-transform duration-300 hover:scale-105">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold text-text-primary">今日已完成打卡</p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock className="w-4 h-4" />
                  <span>上班：<span className="font-semibold text-text-primary">{formatTime(todayRecord.checkIn)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock className="w-4 h-4" />
                  <span>下班：<span className="font-semibold text-text-primary">{formatTime(todayRecord.checkOut)}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getStatusColor(todayRecord.status)} px-3 py-1`}>
                  {getStatusIcon(todayRecord.status)}
                  <span className="ml-1">{getStatusName(todayRecord.status)}</span>
                </Badge>
                <span className="text-sm text-text-tertiary">
                  工时：{formatWorkHours(todayRecord.workHours)}h
                </span>
              </div>
            </div>
          ) : todayRecord?.checkIn ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-blue-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">班中</span>
                </div>
              </div>
              <p className="text-xl font-bold text-text-primary">等待下班打卡</p>
              <p className="text-sm text-text-secondary flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                上班时间：{formatTime(todayRecord.checkIn)}
              </p>
              <Button
                onClick={() => checkInMutation.mutate("out")}
                className="w-40 h-12 text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Clock className="w-5 h-5 mr-2" />
                下班打卡
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-bg-tertiary flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  <Clock className="w-10 h-10 text-text-secondary" />
                </div>
                <div className="absolute inset-0 rounded-full bg-blue-200 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
              </div>
              <p className="text-xl font-bold text-text-primary">开始今日工作</p>
              <p className="text-sm text-text-secondary flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                请在工作地点打卡
              </p>
              <Button
                onClick={() => checkInMutation.mutate("in")}
                className="w-40 h-12 text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Clock className="w-5 h-5 mr-2" />
                上班打卡
              </Button>
            </div>
          )}

          {checkInMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                {(checkInMutation.error as Error).message}
              </p>
            </div>
          )}
        </div>
      </Card>

      {activeTab === "personal" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personalQuery.isLoading && (
            <Card className="p-8 text-center col-span-full">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm text-text-secondary">加载中...</p>
            </Card>
          )}

          {personalQuery.isError && (
            <Card className="p-4 bg-red-50 border-red-200 col-span-full">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                加载失败：{(personalQuery.error as Error).message}
              </p>
            </Card>
          )}

          {personalQuery.data && (
            <>
              <Card className="p-5 col-span-full sm:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-text-primary flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    本月统计
                  </h3>
                  <span className="text-xs text-text-tertiary">
                    {new Date().getFullYear()}年{new Date().getMonth() + 1}月
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                  {[
                    { label: "正常", value: personalQuery.data.stats.normalDays, color: "text-green-600", bg: "bg-green-50" },
                    { label: "迟到", value: personalQuery.data.stats.lateDays, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "早退", value: personalQuery.data.stats.earlyLeaveDays, color: "text-orange-600", bg: "bg-orange-50" },
                    { label: "缺勤", value: personalQuery.data.stats.absentDays, color: "text-red-600", bg: "bg-red-50" },
                    { label: "请假", value: personalQuery.data.stats.leaveDays, color: "text-blue-600", bg: "bg-blue-50" },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} rounded-lg p-3 text-center transition-transform hover:scale-105`}>
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border-secondary">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">本月总工时</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${Math.min((parseFloat(formatWorkHours(personalQuery.data.stats.totalWorkHours)) / 180) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-text-primary">
                        {formatWorkHours(personalQuery.data.stats.totalWorkHours)}h
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
                  <ClipboardText className="w-4 h-4" />
                  今日状态
                </h3>
                {todayRecord ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">打卡状态</span>
                      <Badge className={getStatusColor(todayRecord.status)}>
                        {getStatusName(todayRecord.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">上班时间</span>
                      <span className="font-medium">{formatTime(todayRecord.checkIn)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">下班时间</span>
                      <span className="font-medium">{formatTime(todayRecord.checkOut)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border-secondary">
                      <span className="text-sm text-text-secondary">今日工时</span>
                      <span className="font-bold text-blue-600">{formatWorkHours(todayRecord.workHours)}h</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-text-quaternary mx-auto mb-3" />
                    <p className="text-sm text-text-tertiary">今日尚未打卡</p>
                  </div>
                )}
              </Card>

              <Card className="p-0 overflow-hidden col-span-full">
                <div className="px-5 py-3 border-b border-border-secondary flex items-center justify-between">
                  <h3 className="font-medium text-text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    考勤记录
                  </h3>
                  <span className="text-xs text-text-tertiary">最近30天</span>
                </div>
                {personalQuery.data.records.length === 0 ? (
                  <div className="p-8 text-center">
                    <Clock className="w-12 h-12 text-text-quaternary mx-auto mb-3" />
                    <p className="text-sm text-text-tertiary">暂无考勤记录</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-secondary max-h-80 overflow-y-auto">
                    {personalQuery.data.records.map((record) => (
                      <div
                        key={record.id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-text-secondary">
                            {formatDate(record.date)}
                          </span>
                          <Badge variant="default" className={getStatusColor(record.status)}>
                            {getStatusIcon(record.status)}
                            <span className="ml-1 text-xs">{getStatusName(record.status)}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-text-tertiary">
                            {formatTime(record.checkIn)} - {formatTime(record.checkOut)}
                          </span>
                          <span className="text-sm font-medium text-text-secondary">{formatWorkHours(record.workHours)}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === "enterprise" && (
        <div className="space-y-4">
          {enterpriseQuery.isLoading && (
            <Card className="p-8 text-center">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm text-text-secondary">加载中...</p>
            </Card>
          )}

          {enterpriseQuery.isError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                加载失败：{(enterpriseQuery.error as Error).message}
              </p>
            </Card>
          )}

          {enterpriseQuery.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-5 text-center">
                  <p className="text-3xl font-bold text-text-primary mb-1">{enterpriseQuery.data.totalEmployees}</p>
                  <p className="text-sm text-text-secondary">员工总数</p>
                </Card>
                <Card className="p-5 text-center bg-green-50 border-green-200">
                  <p className="text-3xl font-bold text-green-600 mb-1">{enterpriseQuery.data.checkedIn}</p>
                  <p className="text-sm text-green-600">已打卡</p>
                </Card>
                <Card className="p-5 text-center bg-amber-50 border-amber-200">
                  <p className="text-3xl font-bold text-amber-600 mb-1">{enterpriseQuery.data.late}</p>
                  <p className="text-sm text-amber-600">迟到</p>
                </Card>
                <Card className="p-5 text-center bg-red-50 border-red-200">
                  <p className="text-3xl font-bold text-red-600 mb-1">{enterpriseQuery.data.absent}</p>
                  <p className="text-sm text-red-600">缺勤</p>
                </Card>
              </div>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-medium text-text-primary">
                    {enterpriseQuery.data.date} 出勤率
                  </h3>
                  <span className="text-4xl font-bold text-text-primary">{enterpriseQuery.data.checkInRate}%</span>
                </div>
                <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                    style={{ width: `${enterpriseQuery.data.checkInRate}%` }}
                  />
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-border-secondary">
                  <h3 className="font-medium text-text-primary flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    员工打卡详情
                  </h3>
                </div>
                <div className="divide-y divide-border-secondary max-h-96 overflow-y-auto">
                  {enterpriseQuery.data.details.map((detail, index) => (
                    <div
                      key={index}
                      className="px-5 py-3 flex items-center justify-between hover:bg-bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                          <Users className="w-4 h-4 text-text-tertiary" />
                        </div>
                        <span className="text-sm font-medium text-text-secondary">{detail.userName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-text-tertiary">
                          {detail.checkIn ? formatTime(detail.checkIn) : "--:--"}
                          {detail.checkOut && ` - ${formatTime(detail.checkOut)}`}
                        </span>
                        <Badge
                          className={
                            detail.status === "normal"
                              ? "bg-green-100 text-green-700"
                              : detail.status === "late"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-bg-tertiary text-text-secondary"
                          }
                        >
                          {detail.status === "normal"
                            ? "正常"
                            : detail.status === "late"
                            ? "迟到"
                            : "未打卡"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === "make-up" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4" />
                申请补卡
              </h3>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              提交后请在右侧列表查看审批状态；管理员可通过右上角「补卡审批」入口处理全员申请。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">补卡日期</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    type="date"
                    value={makeUpDate}
                    onChange={(e) => setMakeUpDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">补卡类型</label>
                <Select
                  value={makeUpType}
                  onValueChange={(value) => setMakeUpType(value as "in" | "out")}
                >
                  <option value="in">上班打卡</option>
                  <option value="out">下班打卡</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">补卡原因</label>
                <Textarea
                  value={makeUpReason}
                  onChange={(e) => setMakeUpReason(e.target.value)}
                  rows={3}
                  placeholder="请详细说明补卡原因..."
                  className="resize-none"
                />
              </div>
              <Button
                onClick={() => makeUpMutation.mutate()}
                disabled={!makeUpDate || !makeUpReason || makeUpMutation.status === "pending"}
                className="w-full h-12 font-semibold"
              >
                {makeUpMutation.status === "pending" ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    提交中...
                  </>
                ) : (
                  "提交补卡申请"
                )}
              </Button>
              {makeUpMutation.isSuccess && (
                <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">补卡申请已提交，请查看右侧列表了解审批进度</span>
                </div>
              )}
              {makeUpMutation.isError && (
                <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">提交失败：{(makeUpMutation.error as Error).message}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-border-secondary">
              <h3 className="font-medium text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4" />
                我的补卡记录
              </h3>
            </div>
            {myMakeUpQuery.isLoading && (
              <div className="flex justify-center py-12">
                <Spinner className="w-8 h-8" />
              </div>
            )}
            {myMakeUpQuery.isError && (
              <div className="p-4 bg-red-50">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {(myMakeUpQuery.error as Error).message}
                </p>
              </div>
            )}
            {!myMakeUpQuery.isLoading && !myMakeUpQuery.isError && (myMakeUpQuery.data?.length ?? 0) === 0 && (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 text-text-quaternary mx-auto mb-3" />
                <p className="text-sm text-text-tertiary">暂无补卡申请记录</p>
              </div>
            )}
            {myMakeUpQuery.data &&
              myMakeUpQuery.data.length > 0 &&
              !myMakeUpQuery.isLoading && (
                <div className="divide-y divide-border-secondary max-h-96 overflow-y-auto">
                  {myMakeUpQuery.data.map((row) => (
                    <div key={row.id} className="px-5 py-4 hover:bg-bg-secondary transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-text-primary">
                          {formatMakeUpDay(row.date)} · {formatMakeUpType(row.type)}
                        </span>
                        <Badge className={makeUpStatusTone(row.status)}>
                          {makeUpStatusLabel(row.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-tertiary mb-2">
                        提交于 {formatDateTimeCn(row.createdAt)}
                      </p>
                      <p className="text-sm text-text-secondary">{row.reason}</p>
                      {row.status === "rejected" && row.remark && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                          审批备注：{row.remark}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </Card>
        </div>
      )}

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-xl font-bold text-text-primary">
                {checkInType === "in" ? "上班打卡成功" : "下班打卡成功"}
              </p>
              <p className="text-sm text-text-secondary mt-2">
                打卡时间：{lastCheckInTime}
              </p>
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}