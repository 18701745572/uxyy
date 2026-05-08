"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFollowUpRecords,
  createFollowUpRecord,
  updateFollowUpRecord,
  deleteFollowUpRecord,
  type FollowUpRecordResponseDto,
  type FollowUpType,
  type CreateFollowUpDto,
  type UpdateFollowUpDto,
} from "@/lib/api/crm";
import { fetchCustomersAllPages } from "@/lib/api/customers";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Plus, Edit, Trash2, MessageSquare, Link2 } from "lucide-react";

const NON_TEXT_TYPES: FollowUpType[] = ["image", "voice", "file"];

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 视为本地时间，转为 UTC ISO 供后端 @IsDateString 与存储 */
function nextFollowUpToIso(local: string | undefined): string | undefined {
  if (!local?.trim()) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function attachmentRowsFromInitial(urls?: string[] | null): string[] {
  const list = urls?.filter((u) => u.trim()) ?? [];
  return list.length ? list : [""];
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function attachmentLinkLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "打开";
  }
}

function buildCreatePayload(
  content: string,
  type: FollowUpType,
  attachmentRows: string[],
  nextLocal: string | undefined,
): CreateFollowUpDto {
  const urls = attachmentRows.map((u) => u.trim()).filter(Boolean);
  const nextFollowUpAt = nextFollowUpToIso(nextLocal);
  const dto: CreateFollowUpDto = {
    content: content.trim(),
    type,
  };
  if (urls.length) dto.attachmentUrls = urls;
  if (nextFollowUpAt) dto.nextFollowUpAt = nextFollowUpAt;
  return dto;
}

function buildUpdatePayload(
  content: string,
  type: FollowUpType,
  attachmentRows: string[],
  nextLocal: string | undefined,
): UpdateFollowUpDto {
  const urls = attachmentRows.map((u) => u.trim()).filter(Boolean);
  const nextFollowUpAt = nextLocal?.trim() ? nextFollowUpToIso(nextLocal)! : null;
  return {
    content: content.trim(),
    type,
    attachmentUrls: urls.length ? urls : null,
    nextFollowUpAt,
  };
}

const typeLabels: Record<FollowUpType, string> = {
  text: "文本",
  image: "图片",
  voice: "语音",
  file: "文件",
};

const typeColors: Record<FollowUpType, string> = {
  text: "bg-blue-100 text-blue-800",
  image: "bg-green-100 text-green-800",
  voice: "bg-purple-100 text-purple-800",
  file: "bg-orange-100 text-orange-800",
};

export default function FollowUpsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">跟进记录</h1>
      <FollowUpsPanel />
    </div>
  );
}

function FollowUpsPanel() {
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editing, setEditing] = useState<FollowUpRecordResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const pageSize = 10;

  const qc = useQueryClient();

  const customersQ = useQuery({
    queryKey: ["crm", "customers", "all-pages"],
    queryFn: () => fetchCustomersAllPages(),
  });

  const q = useQuery({
    queryKey: ["crm", "follow-ups", selectedCustomerId, page, pageSize],
    queryFn: () =>
      selectedCustomerId
        ? fetchFollowUpRecords(selectedCustomerId, { page, pageSize })
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize }),
    enabled: !!selectedCustomerId,
  });

  const createM = useMutation({
    mutationFn: (data: { customerId: number; dto: CreateFollowUpDto }) =>
      createFollowUpRecord(data.customerId, data.dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
      setCreating(false);
    },
  });

  const updateM = useMutation({
    mutationFn: (data: {
      customerId: number;
      followUpId: number;
      dto: UpdateFollowUpDto;
    }) => updateFollowUpRecord(data.customerId, data.followUpId, data.dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
      setEditing(null);
    },
  });

  const deleteM = useMutation({
    mutationFn: (data: { customerId: number; followUpId: number }) =>
      deleteFollowUpRecord(data.customerId, data.followUpId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
    },
  });

  const totalPages = q.data ? Math.ceil(q.data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Label>选择客户</Label>
          <Select
            value={selectedCustomerId ? String(selectedCustomerId) : ""}
            onValueChange={(v) => {
              setSelectedCustomerId(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择客户查看跟进记录" />
            </SelectTrigger>
            <SelectContent>
              {customersQ.data?.items.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedCustomerId && (
          <Dialog
            open={creating}
            onOpenChange={(open) => {
              setCreating(open);
              if (open) setCreateFormKey((k) => k + 1);
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 mt-6">
                <Plus className="h-4 w-4" />
                新增跟进
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新增跟进记录</DialogTitle>
              </DialogHeader>
              <FollowUpForm
                key={`new-${createFormKey}`}
                mode="create"
                onSubmit={(data) =>
                  createM.mutate({
                    customerId: selectedCustomerId,
                    dto: data,
                  })
                }
                isSubmitting={createM.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!selectedCustomerId ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>请先选择客户查看跟进记录</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>附件</TableHead>
                  <TableHead>下次跟进</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : q.data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      暂无跟进记录
                    </TableCell>
                  </TableRow>
                ) : (
                  q.data?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className={typeColors[item.type]}>
                          {typeLabels[item.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.content}>
                        {item.content}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.attachmentUrls?.length ? (
                          <div className="flex flex-col gap-0.5">
                            {item.attachmentUrls.slice(0, 2).map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate max-w-[160px]"
                                title={url}
                              >
                                <Link2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{attachmentLinkLabel(url)}</span>
                              </a>
                            ))}
                            {item.attachmentUrls.length > 2 ? (
                              <span className="text-zinc-500">
                                +{item.attachmentUrls.length - 2}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {item.nextFollowUpAt
                          ? format(new Date(item.nextFollowUpAt), "yyyy-MM-dd HH:mm", {
                              locale: zhCN,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm", {
                          locale: zhCN,
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 whitespace-nowrap">
                        {item.createdBy != null ? `用户 ${item.createdBy}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("确定删除该跟进记录吗？")) {
                                deleteM.mutate({
                                  customerId: item.customerId,
                                  followUpId: item.id,
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="flex items-center px-4">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑跟进记录</DialogTitle>
          </DialogHeader>
          {editing && (
            <FollowUpForm
              key={editing.id}
              mode="edit"
              initialData={editing}
              onSubmit={(data) =>
                updateM.mutate({
                  customerId: editing.customerId,
                  followUpId: editing.id,
                  dto: data,
                })
              }
              isSubmitting={updateM.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type FollowUpFormProps =
  | {
      mode: "create";
      initialData?: undefined;
      onSubmit: (data: CreateFollowUpDto) => void;
      isSubmitting: boolean;
    }
  | {
      mode: "edit";
      initialData: FollowUpRecordResponseDto;
      onSubmit: (data: UpdateFollowUpDto) => void;
      isSubmitting: boolean;
    };

function FollowUpForm(props: FollowUpFormProps) {
  const { mode, onSubmit, isSubmitting } = props;
  const initialData = props.mode === "edit" ? props.initialData : undefined;

  const [content, setContent] = useState(initialData?.content ?? "");
  const [type, setType] = useState<FollowUpType>(initialData?.type ?? "text");
  const [nextLocal, setNextLocal] = useState(
    toDatetimeLocalValue(initialData?.nextFollowUpAt),
  );
  const [attachmentRows, setAttachmentRows] = useState(() =>
    attachmentRowsFromInitial(initialData?.attachmentUrls),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    const urls = attachmentRows.map((u) => u.trim()).filter(Boolean);
    if (NON_TEXT_TYPES.includes(type) && urls.length === 0) {
      window.alert("图片 / 语音 / 文件类型请至少填写一个可访问的附件链接（外链或对象存储直链）。");
      return;
    }

    for (const u of urls) {
      if (!isValidHttpUrl(u)) {
        window.alert(`附件链接需为 http(s) 完整地址：\n${u}`);
        return;
      }
    }

    if (mode === "create") {
      onSubmit(buildCreatePayload(trimmed, type, attachmentRows, nextLocal));
    } else {
      onSubmit(buildUpdatePayload(trimmed, type, attachmentRows, nextLocal));
    }
  };

  const showAttachmentHint = NON_TEXT_TYPES.includes(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>类型</Label>
        <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showAttachmentHint ? (
          <p className="text-xs text-zinc-500 mt-1">
            此类跟进建议在下方填写附件链接（图片/录音/文件的可访问 URL）。
          </p>
        ) : null}
      </div>
      <div>
        <Label>内容 *</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入跟进内容"
          required
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="mb-0">附件链接</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAttachmentRows((rows) => [...rows, ""])}
          >
            添加一行
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          支持多个 HTTPS 外链（如 OSS、云盘直链）。当前版本需自行上传文件后粘贴 URL。
        </p>
        <div className="space-y-2">
          {attachmentRows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={row}
                onChange={(e) => {
                  const v = e.target.value;
                  setAttachmentRows((rows) =>
                    rows.map((r, j) => (j === i ? v : r)),
                  );
                }}
                placeholder="https://..."
                className="font-mono text-xs"
              />
              {attachmentRows.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-600"
                  onClick={() =>
                    setAttachmentRows((rows) => rows.filter((_, j) => j !== i))
                  }
                >
                  删除
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>下次跟进时间</Label>
        <Input
          type="datetime-local"
          value={nextLocal}
          onChange={(e) => setNextLocal(e.target.value)}
        />
        <p className="text-xs text-zinc-500 mt-1">留空表示不设下次提醒时间。</p>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
