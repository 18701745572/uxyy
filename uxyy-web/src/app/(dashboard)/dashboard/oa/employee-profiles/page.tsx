"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MagnifyingGlass, Users, Phone, Envelope, Building, ClipboardText } from "@/components/icons";
import {
  canManageEmployeeProfiles,
  createEmployeeProfile,
  deleteEmployeeProfile,
  fetchEmployeeDepartments,
  fetchEmployeeProfiles,
  fetchEnterpriseMembers,
  updateEmployeeProfile,
  type EmployeeProfileRow,
} from "@/lib/api/employee-profiles";
import { ApiError } from "@/lib/api/client";
import { ExportMenu } from "@/components/export/export-menu";
import { EmployeeProfileImportDialog } from "@/components/oa/employee-profile-import-dialog";
import { EmployeeProfileDialog } from "./employee-profile-dialog";

function displayName(row: {
  user: { nickname: string | null; phone: string | null };
}): string {
  return row.user.nickname?.trim() || row.user.phone || "未命名";
}

export default function EmployeeProfilesPage() {
  const qc = useQueryClient();
  const canManage = canManageEmployeeProfiles();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("全部");

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<EmployeeProfileRow | null>(null);

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

  const membersQ = useQuery({
    queryKey: ["oa", "employee-profiles", "members"],
    queryFn: fetchEnterpriseMembers,
    enabled: canManage,
  });

  /** 仅管理员需要从成员接口选人 */
  const membersForDialogs = membersQ.data ?? [];

  const departmentButtons = useMemo(
    () => ["全部", ...(deptQ.data ?? []).filter(Boolean)],
    [deptQ.data],
  );

  const rows = listQ.data ?? [];
  const uniqueDeptCount = deptQ.data?.length ?? 0;

  const invalidateList = () =>
    qc.invalidateQueries({ queryKey: ["oa", "employee-profiles"] });

  const createMut = useMutation({
    mutationFn: createEmployeeProfile,
    onSuccess: () => invalidateList(),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: Parameters<typeof updateEmployeeProfile>[1];
    }) => updateEmployeeProfile(id, body),
    onSuccess: () => invalidateList(),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEmployeeProfile,
    onSuccess: () => invalidateList(),
  });

  const formError =
    createMut.error instanceof ApiError
      ? createMut.error.message
      : updateMut.error instanceof ApiError
        ? updateMut.error.message
        : deleteMut.error instanceof ApiError
          ? deleteMut.error.message
          : null;

  return (
    <div className="space-y-6">
      <EmployeeProfileDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) createMut.reset();
        }}
        mode="create"
        members={membersForDialogs}
        isSubmitting={createMut.isPending}
        editRow={null}
        onSubmitCreate={(payload) => {
          createMut.mutate(payload, {
            onSuccess: () => setAddOpen(false),
          });
        }}
        onSubmitEdit={() => {}}
      />

      <EmployeeProfileDialog
        open={editRow !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditRow(null);
            updateMut.reset();
          }
        }}
        mode="edit"
        editRow={editRow}
        members={membersForDialogs}
        isSubmitting={updateMut.isPending}
        onSubmitCreate={() => {}}
        onSubmitEdit={(profileId, body) => {
          updateMut.mutate(
            { id: profileId, body },
            {
              onSuccess: () => setEditRow(null),
            },
          );
        }}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">员工通讯录</h1>
          <p className="text-text-tertiary mt-1">
            关联本企业成员的 OA 扩展信息；数据来源 users + employee_profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu type="employee_profiles" filename="employee-profiles" />
          {canManage && <EmployeeProfileImportDialog />}
          <Button
            type="button"
            variant="primary"
            disabled={!canManage}
            title={
              canManage
                ? undefined
                : "仅需老板（boss）或行政（oa/admin）等有通讯录管理权限的角色操作"
            }
            onClick={() => {
              if (!canManage) return;
              setAddOpen(true);
              void qc.prefetchQuery({
                queryKey: ["oa", "employee-profiles", "members"],
                queryFn: fetchEnterpriseMembers,
              });
            }}
          >
            添加员工
          </Button>
        </div>
      </div>

      {!canManage && (
        <p className="text-sm text-text-secondary bg-bg-tertiary rounded-md px-3 py-2">
          当前账号仅能查看通讯录。建档、修改、移除档案需<strong>老板</strong>
          或<strong>行政</strong>等有「通讯录管理」（oa:manage）权限的成员操作。
        </p>
      )}

      {(listQ.error || formError) && (
        <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {formError ??
            (listQ.error instanceof ApiError
              ? listQ.error.message
              : String(listQ.error))}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">列表人数</p>
            <p className="text-2xl font-bold text-text-primary">{rows.length}</p>
            <p className="text-xs text-text-muted mt-1">
              （含关键字与部门筛选）
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">部门（去重）</p>
            <p className="text-2xl font-bold text-text-primary">{uniqueDeptCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">接口状态</p>
            <p className="text-sm font-medium text-text-secondary pt-1 break-words leading-snug">
              {listQ.isLoading
                ? "加载中…"
                : listQ.isError
                  ? listQ.error instanceof ApiError
                    ? `加载失败 · ${listQ.error.message}`
                    : "加载失败"
                  : "已连接"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">筛选</p>
            <p className="text-sm text-text-secondary pt-1">
              {filterDept === "全部" ? "全部部门" : filterDept}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
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
            <p className="text-sm text-text-tertiary py-12 text-center">加载中…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无员工档案</p>
              <p className="text-sm mt-1 max-w-md mx-auto text-text-tertiary">
                {canManage
                  ? '请点击右上角「添加员工」，为本企业已在成员列表中的账号建立档案（每人仅一份档案）；亦可运行后端 pnpm db:seed 写入演示数据。'
                  : "请让具备通讯录管理权限的管理员为员工建档。"}
              </p>
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
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-bg-tertiary text-text-secondary">
                          {name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-text-primary">{name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {no}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-text-tertiary mt-1">
                          <Building className="w-3 h-3 shrink-0" />
                          {dept}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-text-tertiary">
                          <ClipboardText className="w-3 h-3 shrink-0" />
                          {pos}
                        </div>
                        <p className="text-xs text-text-muted mt-1">入职 {join}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-text-muted shrink-0" />
                        <span className="text-text-secondary">{phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Envelope className="w-4 h-4 text-text-muted shrink-0" />
                        <span className="text-text-secondary truncate">{email}</span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="mt-4 flex gap-2 border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          className="flex-1"
                          onClick={() => {
                            setEditRow(row);
                            void qc.prefetchQuery({
                              queryKey: ["oa", "employee-profiles", "members"],
                              queryFn: fetchEnterpriseMembers,
                            });
                          }}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deleteMut.isPending}
                          onClick={() => {
                            const msg = `确定移除「${name}」的员工档案吗？账号仍在本企业内，可稍后再建档。`;
                            if (!window.confirm(msg)) return;
                            deleteMut.mutate(row.profile.id);
                          }}
                        >
                          移除
                        </Button>
                      </div>
                    )}
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
