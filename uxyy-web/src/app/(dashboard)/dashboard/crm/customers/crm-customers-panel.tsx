"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type {
  CustomerDto,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@uxyy/shared";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/api/customers";
import {
  fetchCustomerCategories,
  assignCustomerToCategory,
  getCustomerCategories,
  createCustomerMember,
  fetchMemberLevels,
  getMemberLevelColor,
  type CustomerCategoryResponseDto,
  type MemberLevelCode,
  type MemberLevelResponseDto,
} from "@/lib/api/crm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExportMenu } from "@/components/export/export-menu";
import { useCrmCaps } from "@/lib/permissions/crm-capabilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown } from "@/components/icons";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

const CUSTOMER_TYPES = [
  { value: "enterprise", label: "企业客户" },
  { value: "personal", label: "个人客户" },
];

const CUSTOMER_LEVELS = [
  { value: "VIP", label: "VIP" },
  { value: "regular", label: "普通" },
  { value: "potential", label: "潜在" },
];

const CUSTOMER_SOURCES = [
  { value: "manual", label: "手动录入" },
  { value: "import", label: "导入" },
  { value: "wechat", label: "微信" },
  { value: "other", label: "其他" },
];

type CustomerEntityType = CustomerDto["type"];
type CustomerLevel = CustomerDto["level"];
type CustomerSource = CustomerDto["source"];

// 扩展客户类型，包含后端返回的会员信息
interface CustomerWithMemberInfo extends CustomerDto {
  memberInfo?: {
    levelCode?: string;
    levelName?: string;
    availablePoints?: number;
  };
}

function CategorySelect({
  selectedIds,
  onChange,
  categories,
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  categories: CustomerCategoryResponseDto[];
}) {
  const handleToggle = (categoryId: number) => {
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedIds, categoryId]);
    }
  };

  if (categories.length === 0) {
    return (
      <p className="text-sm text-text-tertiary">暂无可用分类，请先至「客户分类」创建</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isSelected = selectedIds.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleToggle(cat.id)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
              isSelected
                ? "border-text-primary bg-text-primary text-white"
                : "border-border-primary bg-bg-primary text-text-secondary hover:border-border-tertiary"
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

function CustomerForm({
  init,
  onDone,
}: {
  init?: CustomerDto;
  onDone: () => void;
}) {
  const isEdit = !!init;
  const [name, setName] = useState(init?.name ?? "");
  const [phone, setPhone] = useState(init?.phone ?? "");
  const [contactPerson, setContactPerson] = useState(init?.contactPerson ?? "");
  const [address, setAddress] = useState(init?.address ?? "");
  const [type, setType] = useState<CustomerEntityType>(init?.type ?? "enterprise");
  const [level, setLevel] = useState<CustomerLevel>(init?.level ?? "regular");
  const [industry, setIndustry] = useState(init?.industry ?? "");
  const [tags, setTags] = useState((init?.tags ?? []).join(", "));
  const [source, setSource] = useState<CustomerSource>(init?.source ?? "manual");
  const [assignedTo, setAssignedTo] = useState(init?.assignedTo?.toString() ?? "");
  const [creditLimit, setCreditLimit] = useState(init?.creditLimit?.toString() ?? "");
  const [remark, setRemark] = useState(init?.remark ?? "");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["crm", "categories"],
    queryFn: () => fetchCustomerCategories(),
  });

  const customerCategoriesQuery = useQuery({
    queryKey: ["crm", "customer-categories", init?.id],
    queryFn: () => getCustomerCategories(init!.id),
    enabled: isEdit && !!init?.id,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const data: CreateCustomerInput | UpdateCustomerInput = {
        name,
        phone: phone || undefined,
        contactPerson: contactPerson || undefined,
        address: address || undefined,
        type,
        level,
        industry: industry || undefined,
        tags: tags.trim() ? tags.split(",").map(t => t.trim()) : undefined,
        source,
        assignedTo: assignedTo ? Number(assignedTo) : undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        remark: remark || undefined,
      };
      return isEdit
        ? updateCustomer(init!.id, data as UpdateCustomerInput)
        : createCustomer(data as CreateCustomerInput);
    },
    onSuccess: async (createdCustomer) => {
      if (selectedCategoryIds.length > 0) {
        const customerId = isEdit ? init!.id : (createdCustomer as CustomerDto).id;
        for (const catId of selectedCategoryIds) {
          await assignCustomerToCategory(customerId, catId);
        }
      }
      qc.invalidateQueries({ queryKey: ["crm", "customers"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const categories = categoriesQuery.data ?? [];
  const assignedCategoryIds = customerCategoriesQuery.data?.map((c) => c.id) ?? [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="客户名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="杭州某某商行"
        />
        <Input
          label="联系人"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          placeholder="张三"
        />
        <Input
          label="电话"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="13800138001"
        />
        <Input
          label="行业"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="零售"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">客户类型</label>
          <select
            className={selectCls}
            value={type}
            onChange={(e) => setType(e.target.value as CustomerEntityType)}
          >
            {CUSTOMER_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">客户等级</label>
          <select
            className={selectCls}
            value={level}
            onChange={(e) => setLevel(e.target.value as CustomerLevel)}
          >
            {CUSTOMER_LEVELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">来源</label>
          <select
            className={selectCls}
            value={source}
            onChange={(e) => setSource(e.target.value as CustomerSource)}
          >
            {CUSTOMER_SOURCES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="归属销售ID"
          type="number"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="1"
        />
        <Input
          label="信用额度"
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="50000"
        />
        <Input
          label="标签（逗号分隔）"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="重点客户, 货到付款"
        />
      </div>

      <Input
        label="地址"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="浙江省杭州市余杭区"
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">客户分类</label>
        {categoriesQuery.isLoading ? (
          <p className="text-sm text-text-tertiary">加载中...</p>
        ) : (
          <CategorySelect
            selectedIds={isEdit ? assignedCategoryIds : selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            categories={categories}
          />
        )}
        <p className="text-xs text-text-tertiary">
          点击选择分类，可多选。分类用于按成交状态、行业、区域等维度管理客户
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">备注</label>
        <textarea
          className={selectCls}
          rows={3}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="重点客户 · 货到付款"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "保存" : "创建"}
        </Button>
      </div>
    </form>
  );
}

// 开通会员表单组件
function CreateMemberForm({
  customer,
  levels,
  onSubmit,
  onCancel,
  isLoading,
}: {
  customer: CustomerDto;
  levels: MemberLevelResponseDto[];
  onSubmit: (data: { customerId: number; levelId?: number; memberNo?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    levelId: levels.find((l) => l.isDefault)?.id ?? (levels[0]?.id || undefined),
    memberNo: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      customerId: customer.id,
      levelId: formData.levelId,
      memberNo: formData.memberNo || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-bg-secondary p-3 rounded-lg">
        <p className="text-sm text-text-tertiary">为客户开通会员</p>
        <p className="font-medium text-text-primary">{customer.name}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">会员等级</label>
        <select
          className={selectCls}
          value={formData.levelId ?? ""}
          onChange={(e) =>
            setFormData({ ...formData, levelId: e.target.value ? parseInt(e.target.value) : undefined })
          }
        >
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.name}
              {level.isDefault ? " (默认)" : ""}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="会员卡号（可选）"
        value={formData.memberNo}
        onChange={(e) => setFormData({ ...formData, memberNo: e.target.value })}
        placeholder="留空自动生成"
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" loading={isLoading}>
          开通会员
        </Button>
      </div>
    </form>
  );
}

export function CrmCustomersPanel() {
  const crm = useCrmCaps();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [memberCustomer, setMemberCustomer] = useState<CustomerDto | null>(null);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["crm", "customers", page, pageSize],
    [page],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchCustomers({ page, pageSize }),
    placeholderData: (prev) => prev,
  });

  const { data: levels } = useQuery({
    queryKey: ["crm", "member-levels"],
    queryFn: fetchMemberLevels,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "customers"] }),
  });

  const createMemberMutation = useMutation({
    mutationFn: createCustomerMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "members"] });
      setMemberCustomer(null);
    },
  });

  useEffect(() => {
    if (!crm.write) {
      setCreating(false);
      setEditing(null);
    }
  }, [crm.write]);

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating && crm.write) {
    return (
      <Card>
        <h2 className="font-medium text-text-primary mb-4">新建客户</h2>
        <CustomerForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing && crm.write) {
    return (
      <Card>
        <h2 className="font-medium text-text-primary mb-4">
          编辑客户 · {editing.name}
        </h2>
        <CustomerForm
          init={editing}
          onDone={() => setEditing(null)}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-lg font-semibold text-text-primary">客户列表</h1>
        <div className="flex items-center gap-2">
          <ExportMenu type="customers" filename="customers" />
          {crm.write ? (
            <Button onClick={() => setCreating(true)}>+ 新建客户</Button>
          ) : (
            <p className="text-xs text-text-tertiary">
              无 crm:write，仅可浏览列表
            </p>
          )}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {q.isLoading ? (
          <p className="text-sm text-text-secondary p-6">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700 p-6">
            {q.error instanceof Error ? q.error.message : String(q.error)}
          </pre>
        ) : (
          <>
            <div className="px-4 py-3 text-sm text-text-secondary border-b border-border-secondary flex justify-between">
              <span>
                共 <strong>{q.data?.total ?? 0}</strong> 条 · 第{" "}
                <strong>{q.data?.page ?? page}</strong> 页
              </span>
            </div>

            {!q.data?.items?.length ? (
              <p className="p-8 text-center text-sm text-text-tertiary">
                暂无客户数据
              </p>
            ) : (
              <ul className="divide-y divide-border-secondary">
                {(q.data?.items ?? []).map((row: CustomerWithMemberInfo) => (
                  <li
                    key={row.id}
                    className="px-4 py-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-text-primary">
                            {row.name}
                          </span>
                          <span className="text-xs text-text-tertiary">#{row.id}</span>
                          {row.level === "VIP" && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                          {row.contactPerson && (
                            <span>联系人: {row.contactPerson}</span>
                          )}
                          {row.phone && (
                            <span>电话: {row.phone}</span>
                          )}
                          {row.type && (
                            <span>类型: {row.type === "enterprise" ? "企业" : "个人"}</span>
                          )}
                          {row.industry && (
                            <span>行业: {row.industry}</span>
                          )}
                        </div>
                        {row.memberInfo && (
                          <div className="flex items-center gap-2 mt-2">
                            <Link
                              href={`/dashboard/crm/members?search=${encodeURIComponent(row.name)}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                row.memberInfo.levelCode
                                  ? getMemberLevelColor(row.memberInfo.levelCode as MemberLevelCode)
                                  : "bg-bg-tertiary text-text-secondary"
                              }`}
                            >
                              <Crown className="w-3 h-3" />
                              {row.memberInfo.levelName || "会员"}
                              {row.memberInfo.availablePoints !== undefined && (
                                <span className="ml-1">· {row.memberInfo.availablePoints}积分</span>
                              )}
                            </Link>
                          </div>
                        )}
                        {row.tags && row.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {row.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {row.remark && (
                          <div className="text-sm text-text-tertiary mt-2">
                            {row.remark}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {crm.write ? (
                          <>
                            {!row.memberInfo && (
                              <Button
                                variant="secondary"
                                className="text-xs px-2.5 py-1 gap-1"
                                onClick={() => setMemberCustomer(row)}
                              >
                                <Crown className="w-3 h-3" />
                                开通会员
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              className="text-xs px-2.5 py-1"
                              onClick={() => setEditing(row)}
                            >
                              编辑
                            </Button>
                          </>
                        ) : null}
                        {crm.delete ? (
                          <Button
                            variant="danger"
                            className="text-xs px-2.5 py-1"
                            loading={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm("确定删除该客户？")) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-3 px-4 py-3 border-t border-border-secondary">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* 开通会员对话框 */}
      <Dialog open={!!memberCustomer} onOpenChange={() => setMemberCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>开通会员</DialogTitle>
          </DialogHeader>
          {memberCustomer && levels && (
            <CreateMemberForm
              customer={memberCustomer}
              levels={levels}
              onSubmit={(data) => createMemberMutation.mutate(data)}
              onCancel={() => setMemberCustomer(null)}
              isLoading={createMemberMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}