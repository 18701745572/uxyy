"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  checkIn,
  getPersonalAttendance,
  getEnterpriseOverview,
  requestMakeUp,
  type AttendanceRecord,
} from "@/lib/api/attendance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

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
      return "bg-zinc-100 text-zinc-700";
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

export function AttendancePanel() {
  const [activeTab, setActiveTab] = useState<"personal" | "enterprise" | "make-up">("personal");
  const [makeUpDate, setMakeUpDate] = useState("");
  const [makeUpType, setMakeUpType] = useState<"in" | "out">("in");
  const [makeUpReason, setMakeUpReason] = useState("");
  const queryClient = useQueryClient();

  // 获取个人考勤记录
  const personalQuery = useQuery({
    queryKey: ["attendance", "personal"],
    queryFn: () => getPersonalAttendance(),
    retry: 1,
  });

  // 获取企业考勤概览
  const enterpriseQuery = useQuery({
    queryKey: ["attendance", "enterprise"],
    queryFn: () => getEnterpriseOverview(),
    retry: 1,
  });

  // 打卡操作
  const checkInMutation = useMutation({
    mutationFn: (type: "in" | "out") => checkIn(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  // 补卡申请
  const makeUpMutation = useMutation({
    mutationFn: () => requestMakeUp(makeUpDate, makeUpType, makeUpReason),
    onSuccess: () => {
      setMakeUpDate("");
      setMakeUpReason("");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const tabs = [
    { id: "personal", label: "我的考勤" },
    { id: "enterprise", label: "企业概览" },
    { id: "make-up", label: "补卡申请" },
  ] as const;

  // 获取今日状态
  const todayRecord = personalQuery.data?.records.find((r) => {
    const today = new Date().toISOString().split("T")[0];
    return r.date.startsWith(today);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">考勤管理</h1>
        <p className="text-sm text-zinc-600">上下班打卡、考勤记录查询</p>
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
              key={tab.id}
              variant={activeTab === tab.id ? "primary" : "secondary"}    
              onClick={() => setActiveTab(tab.id)}
            >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 打卡区域 */}
      <Card className="p-6 text-center">
        <p className="text-sm text-zinc-600 mb-4">
          {new Date().toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>

        {checkInMutation.status === 'pending' ? (
          <div className="flex flex-col items-center gap-4">
            <Spinner className="w-8 h-8" />
            <p className="text-sm text-zinc-600">正在打卡...</p>
          </div>
        ) : todayRecord?.checkIn && todayRecord?.checkOut ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-zinc-900">今日已完成打卡</p>
            <div className="flex gap-4 text-sm">
              <span className="text-zinc-600">
                上班：<span className="font-medium">{formatTime(todayRecord.checkIn)}</span>
              </span>
              <span className="text-zinc-600">
                下班：<span className="font-medium">{formatTime(todayRecord.checkOut)}</span>
              </span>
            </div>
            <Badge className={getStatusColor(todayRecord.status)}>
              {getStatusName(todayRecord.status)}
            </Badge>
          </div>
        ) : todayRecord?.checkIn ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-zinc-900">等待下班打卡</p>
            <p className="text-sm text-zinc-600">
              上班时间：{formatTime(todayRecord.checkIn)}
            </p>
            <Button
              onClick={() => checkInMutation.mutate("out")}
              className="w-32"
            >
              下班打卡
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-zinc-900">开始今日工作</p>
            <Button
              onClick={() => checkInMutation.mutate("in")}
              className="w-32"
            >
              上班打卡
            </Button>
          </div>
        )}

        {checkInMutation.isSuccess && (
          <p className="mt-4 text-sm text-green-700">
            ✓ {checkInMutation.data?.message}
          </p>
        )}

        {checkInMutation.isError && (
          <p className="mt-4 text-sm text-red-700">
            ✗ {(checkInMutation.error as Error).message}
          </p>
        )}
      </Card>

      {/* 我的考勤 */}
      {activeTab === "personal" && (
        <div className="flex flex-col gap-4">
          {personalQuery.isLoading && (
            <Card className="p-8 text-center">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm text-zinc-600">加载中...</p>
            </Card>
          )}

          {personalQuery.isError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">
                加载失败：{(personalQuery.error as Error).message}
              </p>
            </Card>
          )}

          {personalQuery.data && (
            <>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 mb-4">本月统计</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                  <StatItem
                    label="正常"
                    value={personalQuery.data.stats.normalDays}
                    color="text-green-600"
                  />
                  <StatItem
                    label="迟到"
                    value={personalQuery.data.stats.lateDays}
                    color="text-amber-600"
                  />
                  <StatItem
                    label="早退"
                    value={personalQuery.data.stats.earlyLeaveDays}
                    color="text-orange-600"
                  />
                  <StatItem
                    label="缺勤"
                    value={personalQuery.data.stats.absentDays}
                    color="text-red-600"
                  />
                  <StatItem
                    label="请假"
                    value={personalQuery.data.stats.leaveDays}
                    color="text-blue-600"
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">总工时</span>
                    <span className="font-medium text-zinc-900">
                      {personalQuery.data.stats.totalWorkHours.toFixed(1)} 小时
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 text-sm text-zinc-600 border-b border-zinc-100">
                  考勤记录
                </div>
                {personalQuery.data.records.length === 0 ? (
                  <p className="p-8 text-center text-sm text-zinc-500">暂无考勤记录</p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {personalQuery.data.records.map((record) => (
                      <div
                        key={record.id}
                        className="px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-zinc-700">
                            {formatDate(record.date)}
                          </span>
                          <Badge className={getStatusColor(record.status)}>
                            {getStatusName(record.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-600">
                          <span>
                            {formatTime(record.checkIn)} - {formatTime(record.checkOut)}
                          </span>
                          <span>{record.workHours.toFixed(1)}h</span>
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

      {/* 企业概览 */}
      {activeTab === "enterprise" && (
        <div className="flex flex-col gap-4">
          {enterpriseQuery.isLoading && (
            <Card className="p-8 text-center">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm text-zinc-600">加载中...</p>
            </Card>
          )}

          {enterpriseQuery.isError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">
                加载失败：{(enterpriseQuery.error as Error).message}
              </p>
            </Card>
          )}

          {enterpriseQuery.data && (
            <>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 mb-4">
                  {enterpriseQuery.data.date} 考勤概览
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-zinc-50 rounded-lg">
                    <p className="text-2xl font-bold text-zinc-900">
                      {enterpriseQuery.data.totalEmployees}
                    </p>
                    <p className="text-xs text-zinc-600">员工总数</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {enterpriseQuery.data.checkedIn}
                    </p>
                    <p className="text-xs text-green-600">已打卡</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">
                      {enterpriseQuery.data.late}
                    </p>
                    <p className="text-xs text-amber-600">迟到</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {enterpriseQuery.data.absent}
                    </p>
                    <p className="text-xs text-red-600">缺勤</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-zinc-900">
                      {enterpriseQuery.data.checkInRate}%
                    </p>
                    <p className="text-xs text-zinc-600">出勤率</p>
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 text-sm text-zinc-600 border-b border-zinc-100">
                  员工打卡详情
                </div>
                <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
                  {enterpriseQuery.data.details.map((detail, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <span className="text-sm text-zinc-700">{detail.userName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {detail.checkIn ? formatTime(detail.checkIn) : "--:--"} -{" "}
                          {detail.checkOut ? formatTime(detail.checkOut) : "--:--"}
                        </span>
                        <Badge
                          className={
                            detail.status === "normal"
                              ? "bg-green-100 text-green-700"
                              : detail.status === "late"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-700"
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

      {/* 补卡申请 */}
      {activeTab === "make-up" && (
        <Card className="p-6">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">申请补卡</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">补卡日期</label>
              <input
                type="date"
                value={makeUpDate}
                onChange={(e) => setMakeUpDate(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">补卡类型</label>
              <select
                value={makeUpType}
                onChange={(e) => setMakeUpType(e.target.value as "in" | "out")}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                <option value="in">上班打卡</option>
                <option value="out">下班打卡</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">补卡原因</label>
              <textarea
                value={makeUpReason}
                onChange={(e) => setMakeUpReason(e.target.value)}
                rows={3}
                placeholder="请说明补卡原因..."
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
              />
            </div>
            <Button
              onClick={() => makeUpMutation.mutate()}
              disabled={!makeUpDate || !makeUpReason || makeUpMutation.status === 'pending'}
              className="w-full"
            >
              {makeUpMutation.status === 'pending' ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  提交中
                </>
              ) : (
                "提交申请"
              )}
            </Button>
            {makeUpMutation.isSuccess && (
              <p className="text-sm text-green-700 text-center">
                ✓ 补卡申请已提交，等待审批
              </p>
            )}
            {makeUpMutation.isError && (
              <p className="text-sm text-red-700 text-center">
                ✗ 提交失败：{(makeUpMutation.error as Error).message}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-zinc-600">{label}</p>
    </div>
  );
}