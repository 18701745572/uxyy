"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  ENTERPRISE_MEMBER_ASSIGNABLE_OPTIONS,
  canManageEnterpriseMembers,
  fetchEnterpriseMemberRows,
  inviteEnterpriseMember,
  labelForEnterpriseRole,
  removeEnterpriseMember,
  updateEnterpriseMemberRole,
  type EnterpriseMemberRow,
} from "@/lib/api/enterprise-members";
import { createEnterpriseMemberInvitation } from "@/lib/api/invitations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readJwtAccessClaims } from "@/lib/api/jwt-payload";
import { readStoredAccessToken } from "@/lib/api/token-store";

export default function EnterpriseMembersPage() {
  const qc = useQueryClient();
  const jwtRole = useMemo(() => {
    const tok = readStoredAccessToken();
    if (!tok) return undefined;
    return readJwtAccessClaims(tok)?.role;
  }, []);
  const canManage = canManageEnterpriseMembers(jwtRole);

  const [phone, setPhone] = useState("");
  const [inviteRole, setInviteRole] = useState<
    (typeof ENTERPRISE_MEMBER_ASSIGNABLE_OPTIONS)[number]["value"]
  >(ENTERPRISE_MEMBER_ASSIGNABLE_OPTIONS[0].value);

  const listQ = useQuery({
    queryKey: ["enterprise", "members"],
    queryFn: fetchEnterpriseMemberRows,
    enabled: canManage,
  });

  const inviteMut = useMutation({
    mutationFn: inviteEnterpriseMember,
    onSuccess: () => {
      toast.success("已加入企业");
      setPhone("");
      void qc.invalidateQueries({ queryKey: ["enterprise", "members"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "添加失败";
      toast.error(msg);
    },
  });

  const inviteLinkMut = useMutation({
    mutationFn: createEnterpriseMemberInvitation,
    onSuccess: async (res) => {
      const fullUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${res.joinRelativePath}`
          : res.joinRelativePath;
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {
        /* noop */
      }
      toast.success("邀请链接已生成并复制到剪贴板", {
        description: `有效期至 ${new Date(res.expiresAt).toLocaleString()}，路径 ${res.joinRelativePath}`,
      });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "生成链接失败");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number;
      role: string;
    }) => updateEnterpriseMemberRole(userId, role),
    onSuccess: () => {
      toast.success("角色已更新");
      void qc.invalidateQueries({ queryKey: ["enterprise", "members"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "更新失败");
    },
  });

  const removeMut = useMutation({
    mutationFn: removeEnterpriseMember,
    onSuccess: () => {
      toast.success("已移出成员");
      void qc.invalidateQueries({ queryKey: ["enterprise", "members"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "移除失败");
    },
  });

  const rows = listQ.data ?? [];

  if (!canManage) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <nav className="text-sm">
          <Link href="/dashboard/profile" className="text-text-tertiary hover:text-text-primary">
            ← 用户资料
          </Link>
        </nav>
        <h1 className="text-lg font-semibold text-text-primary">企业成员</h1>
        <p className="text-sm text-text-secondary">
          仅<strong>老板</strong>（boss）或<strong>行政</strong>（oa）可管理企业与成员权限（system:member）。
          当前账号不满足条件。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <nav className="text-sm">
        <Link href="/dashboard/profile" className="text-text-tertiary hover:text-text-primary">
          ← 用户资料
        </Link>
      </nav>
      <h1 className="text-lg font-semibold text-text-primary">企业成员</h1>
      <p className="text-sm text-text-tertiary">
        成员关系与邀请记录统一：<strong>已注册</strong>可在此直接入库，或未注册用户先发邀请链接再走受限注册并入会。
        五种角色中仅可指派 finance / sales / warehouse / oa；boss 仅限企业主链路。
      </p>

      <Card className="p-4 space-y-3">
        <h2 className="font-medium text-text-primary">添加成员（统一邀请模型）</h2>
        <p className="text-xs text-text-tertiary leading-relaxed">
          同一手机号可被管理员写入两种操作：<strong>直接加入</strong>（对方须已在本站注册）；或<strong>生成邀请链接</strong>（可先分享链接，
          未注册用户打开 /join?t=… 仅能设密码入会，已注册用户登录后点此链接接受）。
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
          <div className="flex-1 w-full space-y-1">
            <label htmlFor="m-phone" className="text-xs text-text-tertiary">
              手机号（11 位）
            </label>
            <Input
              id="m-phone"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              placeholder="13900138901"
              className="max-w-xs"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-text-tertiary block">角色</span>
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as typeof inviteRole)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTERPRISE_MEMBER_ASSIGNABLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={phone.length !== 11 || inviteMut.isPending}
              onClick={() => inviteMut.mutate({ phone, role: inviteRole })}
            >
              {inviteMut.isPending ? "提交中…" : "直接加入（需已注册）"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={phone.length !== 11 || inviteLinkMut.isPending}
              onClick={() => inviteLinkMut.mutate({ phone, role: inviteRole })}
            >
              {inviteLinkMut.isPending ? "生成中…" : "生成邀请链接"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-medium text-text-primary mb-3">成员列表</h2>
        {(listQ.error || listQ.isLoading) && (
          <p className="text-sm text-text-tertiary mb-3">
            {listQ.isLoading
              ? "加载中…"
              : listQ.error instanceof Error
                ? listQ.error.message
                : String(listQ.error ?? "")}
          </p>
        )}
        {!listQ.data?.length && !listQ.isLoading && (
          <p className="text-sm text-text-tertiary">暂无成员数据</p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-tertiary border-b border-border-secondary">
                  <th className="py-2 pr-3">姓名/手机</th>
                  <th className="py-2 pr-3">角色</th>
                  <th className="py-2 pr-3">标记</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <MemberRowEditable
                    key={row.userId}
                    row={row}
                    onSaveRole={(userId, role) => updateMut.mutate({ userId, role })}
                    onRemove={(userId) => removeMut.mutate(userId)}
                    updating={updateMut.isPending}
                    removing={removeMut.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MemberRowEditable(props: {
  row: EnterpriseMemberRow;
  onSaveRole: (userId: number, role: string) => void;
  onRemove: (userId: number) => void;
  updating: boolean;
  removing: boolean;
}) {
  const { row, onSaveRole, onRemove, updating, removing } = props;
  const [roleDraft, setRoleDraft] = useState(row.role);

  useEffect(() => {
    setRoleDraft(row.role);
  }, [row.role]);

  const display =
    row.nickname?.trim() ||
    row.phone ||
    String(row.userId);

  return (
    <tr className="border-b border-border-secondary">
      <td className="py-2 pr-3">
        <div className="font-medium text-text-primary">{display}</div>
        {row.phone && (
          <div className="text-xs text-text-tertiary font-mono">{row.phone}</div>
        )}
      </td>
      <td className="py-2 pr-3">
        {row.isOwner ? (
          <span className="text-text-secondary">
            {labelForEnterpriseRole(row.role)}（企业主）
          </span>
        ) : (
          <Select value={roleDraft} onValueChange={setRoleDraft}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTERPRISE_MEMBER_ASSIGNABLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="py-2 pr-3 text-xs text-text-tertiary">
        {row.isOwner && "owner · "}
        {row.isDefault && "默认企业 · "}
        userId {row.userId}
      </td>
      <td className="py-2">
        {!row.isOwner && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="text-xs h-8"
              disabled={updating || roleDraft === row.role}
              onClick={() => onSaveRole(row.userId, roleDraft)}
            >
              保存角色
            </Button>
            <Button
              type="button"
              variant="danger"
              className="text-xs h-8"
              disabled={removing}
              onClick={() => {
                if (!window.confirm("确定将该成员移出本企业？")) return;
                onRemove(row.userId);
              }}
            >
              移出
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
