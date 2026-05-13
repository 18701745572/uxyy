"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreateEmployeeProfilePayload,
  EmployeeProfileRow,
  EnterpriseMemberCandidate,
  UpdateEmployeeProfilePayload,
} from "@/lib/api/employee-profiles";

type Mode = "create" | "edit";

function sliceDate(d: unknown): string {
  if (d == null) return "";
  const s = String(d);
  return s.slice(0, 10);
}

export type EmployeeProfileFormValues = {
  userIdStr: string;
  department: string;
  position: string;
  employeeNo: string;
  phone: string;
  email: string;
  joinDate: string;
};

const emptyForm: EmployeeProfileFormValues = {
  userIdStr: "",
  department: "",
  position: "",
  employeeNo: "",
  phone: "",
  email: "",
  joinDate: "",
};

interface EmployeeProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  /** 编辑时传入列表行数据 */
  editRow?: EmployeeProfileRow | null;
  members: EnterpriseMemberCandidate[];
  isSubmitting: boolean;
  onSubmitCreate: (payload: CreateEmployeeProfilePayload) => void;
  onSubmitEdit: (
    profileId: number,
    payload: UpdateEmployeeProfilePayload,
  ) => void;
}

export function EmployeeProfileDialog({
  open,
  onOpenChange,
  mode,
  editRow,
  members,
  isSubmitting,
  onSubmitCreate,
  onSubmitEdit,
}: EmployeeProfileDialogProps) {
  const [form, setForm] = useState<EmployeeProfileFormValues>(emptyForm);

  const pickableMembers = useMemo(
    () => members.filter((m) => !m.hasProfile),
    [members],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editRow) {
      setForm({
        userIdStr: String(editRow.profile.userId),
        department: editRow.profile.department ?? "",
        position: editRow.profile.position ?? "",
        employeeNo: editRow.profile.employeeNo ?? "",
        phone:
          editRow.profile.phone ??
          editRow.user.phone ??
          "",
        email: editRow.profile.email ?? "",
        joinDate: sliceDate(editRow.profile.joinDate),
      });
      return;
    }
    const firstPick = pickableMembers[0];
    setForm({
      ...emptyForm,
      userIdStr: firstPick ? String(firstPick.userId) : "",
    });
  }, [open, mode, editRow, pickableMembers]);

  const update =
    <K extends keyof EmployeeProfileFormValues>(key: K) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const rest = {
      department: form.department.trim() || undefined,
      position: form.position.trim() || undefined,
      employeeNo: form.employeeNo.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      joinDate: form.joinDate.trim() || undefined,
    };
    if (mode === "create") {
      const uid = Number(form.userIdStr);
      if (!Number.isFinite(uid) || uid < 1) return;
      onSubmitCreate({ userId: uid, ...rest });
      return;
    }
    if (editRow?.profile.id != null) {
      onSubmitEdit(editRow.profile.id, rest);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "添加员工档案" : "编辑员工档案"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {mode === "create" ? (
              <div className="grid gap-1.5">
                <Label>关联账号（仅显示尚未建档的成员）</Label>
                {pickableMembers.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                    暂无未建档的成员。新员工需先邀请加入当前企业后再在此建档。
                  </p>
                ) : (
                  <Select
                    value={form.userIdStr}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, userIdStr: v }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择用户" />
                    </SelectTrigger>
                    <SelectContent>
                      {pickableMembers.map((m) => {
                        const label =
                          m.nickname?.trim() ||
                          m.phone ||
                          `用户 #${m.userId}`;
                        return (
                          <SelectItem key={m.userId} value={String(m.userId)}>
                            {`${label}（${m.enterpriseRole}${m.phone ? ` · ${m.phone}` : ""}）`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : editRow ? (
              <div className="rounded-md bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                账号：
                <span className="font-medium text-text-primary">
                  {" "}
                  {editRow.user.nickname?.trim() ||
                    editRow.user.phone ||
                    `#${editRow.user.id}`}
                </span>
                <span className="text-text-muted">
                  {" "}
                  · 用户 ID {editRow.profile.userId}
                </span>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="ep-dept">部门</Label>
              <Input
                id="ep-dept"
                value={form.department}
                onChange={update("department")}
                placeholder="如：运营部"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-pos">职位</Label>
              <Input
                id="ep-pos"
                value={form.position}
                onChange={update("position")}
                placeholder="如：店长"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-no">工号</Label>
              <Input
                id="ep-no"
                value={form.employeeNo}
                onChange={update("employeeNo")}
                placeholder="如：EMP-001"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-phone">通讯录电话（可选）</Label>
              <Input
                id="ep-phone"
                value={form.phone}
                onChange={update("phone")}
                placeholder="与客户资料中的手机可不同"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-email">邮箱</Label>
              <Input
                id="ep-email"
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="name@company.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-join">入职日期</Label>
              <Input
                id="ep-join"
                type="date"
                value={form.joinDate}
                onChange={update("joinDate")}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmitting ||
                (mode === "create" && pickableMembers.length === 0)
              }
            >
              {isSubmitting ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
