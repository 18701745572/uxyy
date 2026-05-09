"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  Receipt, 
  Users, 
  Settings,
  Clock,
  CheckCircle,
  AlertCircle 
} from "lucide-react";

const oaModules = [
  {
    title: "审批流程",
    description: "配置采购、销售、报销、请假审批流程",
    icon: Settings,
    href: "/dashboard/oa/approval-flows",
    color: "bg-blue-500",
  },
  {
    title: "请假管理",
    description: "事假、病假、年假申请与审批",
    icon: Calendar,
    href: "/dashboard/oa/leave-requests",
    color: "bg-green-500",
  },
  {
    title: "报销管理",
    description: "费用报销申请、凭证上传与审批",
    icon: Receipt,
    href: "/dashboard/oa/expense-requests",
    color: "bg-orange-500",
  },
  {
    title: "考勤打卡",
    description: "上下班打卡、考勤记录查询、补卡申请",
    icon: Clock,
    href: "/dashboard/oa/attendance",
    color: "bg-indigo-500",
  },
  {
    title: "员工通讯录",
    description: "员工信息、部门管理、联系方式",
    icon: Users,
    href: "/dashboard/oa/employee-profiles",
    color: "bg-purple-500",
  },
];

const quickStats = [
  { label: "待审批", value: "0", icon: Clock, color: "text-yellow-600" },
  { label: "已通过", value: "0", icon: CheckCircle, color: "text-green-600" },
  { label: "已驳回", value: "0", icon: AlertCircle, color: "text-red-600" },
];

export default function OaPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">OA 办公</h1>
          <p className="text-zinc-500 mt-1">审批流程、请假报销、员工管理</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/oa/leave-requests/new">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              请假申请
            </Button>
          </Link>
          <Link href="/dashboard/oa/expense-requests/new">
            <Button size="sm">
              <Receipt className="w-4 h-4 mr-2" />
              报销申请
            </Button>
          </Link>
        </div>
      </div>

      {/* 快捷统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-zinc-500">{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-900 mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 功能模块 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {oaModules.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-start gap-4 p-6">
                <div className={`${module.color} p-3 rounded-lg`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">{module.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{module.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 最近申请 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            最近申请
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无申请记录</p>
            <p className="text-sm mt-1">点击上方按钮发起请假或报销申请</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
