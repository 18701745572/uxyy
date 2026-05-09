"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, Phone, Mail, Building2, Briefcase } from "lucide-react";
import {
  fetchEmployeeDepartments,
  fetchEmployeeProfiles,
} from "@/lib/api/employee-profiles";
import { ApiError } from "@/lib/api/client";

function displayName(row: {
  user: { nickname: string | null; phone: string | null };
}): string {
  return row.user.nickname?.trim() || row.user.phone || "未命名";
}

export default function EmployeeProfilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("全部");

  const deptQ = useQuery({
    queryKey: ["oa", "employee-profiles", "departments"],
    queryFn: fetchEmployeeDepartments,
  });

  const listQ = useQuery({
    queryKey: ["oa", "employee-profiles", "list", filterDept, searchQuery],
    queryFn: () =>
      fetchEmployeeProfiles({
        ...(filterDept !== "全部" ? { department: filterDept } : {}),
        ...(searchQuery.trim() ? { keyword: searchQuery.trim() } : {}),
      }),
  });

  const departmentButtons = useMemo(
    () => ["全部", ...(deptQ.data ?? []).filter(Boolean)],
    [deptQ.data],
  );

  const rows = listQ.data ?? [];

  const uniqueDeptCount = deptQ.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">员工通讯录</h1>
          <p className="text-zinc-500 mt-1">来自后端 OA 员工扩展表与用户资料</p>
        </div>
        <Button type="button" variant="secondary" disabled title="请在具备权限的后台或接口中创建档案">
          添加员工
        </Button>
      </div>

      {listQ.isError && (
        <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {listQ.error instanceof ApiError
            ? listQ.error.message
            : String(listQ.error)}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">员工总数</p>
            <p className="text-2xl font-bold text-zinc-900">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">部门（去重）</p>
            <p className="text-2xl font-bold text-zinc-900">{uniqueDeptCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">接口状态</p>
            <p className="text-sm font-medium text-zinc-700 pt-1">
              {listQ.isLoading ? "加载中…" : listQ.isError ? "失败" : "已连接"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">筛选</p>
            <p className="text-sm text-zinc-600 pt-1">
              {filterDept === "全部" ? "全部部门" : filterDept}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索姓名、手机、部门、职位（走后端 keyword）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {departmentButtons.map((dept) => (
            <Button
              key={dept}
              variant={filterDept === dept ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterDept(dept)}
            >
              {dept}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">员工列表</CardTitle>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <p className="text-sm text-zinc-500 py-12 text-center">加载中…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无员工档案</p>
              <p className="text-sm mt-1">可在种子数据或管理接口中写入 employee_profiles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((row) => {
                const name = displayName(row);
                const phone = row.profile.phone ?? row.user.phone ?? "—";
                const email = row.profile.email ?? "—";
                const dept = row.profile.department ?? "—";
                const pos = row.profile.position ?? "—";
                const no = row.profile.employeeNo ?? `#${row.profile.id}`;
                const join = row.profile.joinDate
                  ? String(row.profile.joinDate).slice(0, 10)
                  : "—";
                return (
                  <div
                    key={row.profile.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-zinc-200 text-zinc-700">
                          {name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-zinc-900">{name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {no}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-zinc-500 mt-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {dept}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-zinc-500">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          {pos}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">入职 {join}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-zinc-600">{phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-zinc-600 truncate">{email}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
