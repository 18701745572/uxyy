"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ImportMode = "skip" | "force";

export interface ImportResult {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
}

export interface ImportDialogProps {
  /** 对话框标题 */
  title: string;
  /** 导入说明文本 */
  description: string;
  /** 导入 API 函数 */
  importFn: (file: File, mode: ImportMode) => Promise<ImportResult>;
  /** 导入成功后需要刷新的 query key */
  refreshQueryKey: string[];
  /** 触发按钮文本 */
  buttonLabel?: string;
  /** 跳过重复模式的说明文本 */
  skipModeDescription?: string;
  /** 强制写入模式的说明文本 */
  forceModeDescription?: string;
}

export function ImportDialog({
  title,
  description,
  importFn,
  refreshQueryKey,
  buttonLabel = "批量导入",
  skipModeDescription = "跳过重复（同企业下名称已存在则跳过该行，默认推荐）",
  forceModeDescription = "强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）",
}: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("skip");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("请选择文件");
      return importFn(file, mode);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: refreshQueryKey });
    },
  });

  function resetState() {
    setFile(null);
    mutation.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    setOpen(false);
    resetState();
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <UploadSimple className="h-4 w-4" />
        {buttonLabel}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setOpen(true);
          else handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            {description}
          </p>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-text-secondary">
                重复处理
              </p>
              <div className="flex flex-col gap-2.5 text-sm text-text-secondary">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    className="mt-1"
                    checked={mode === "skip"}
                    onChange={() => setMode("skip")}
                  />
                  <span>{skipModeDescription}</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    className="mt-1"
                    checked={mode === "force"}
                    onChange={() => setMode("force")}
                  />
                  <span>{forceModeDescription}</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setFile(f ?? null);
                  mutation.reset();
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                选择文件
              </Button>
              {file ? (
                <span className="text-sm text-text-tertiary">{file.name}</span>
              ) : (
                <span className="text-sm text-text-tertiary">未选择文件</span>
              )}
            </div>
          </div>

          {mutation.isSuccess && mutation.data ? (
            <div className="space-y-2 rounded-md border border-border-primary bg-bg-secondary p-3 text-sm">
              <p className="text-text-primary">
                导入完成：新建 <strong>{mutation.data.created}</strong> 条，跳过{" "}
                <strong>{mutation.data.skipped}</strong> 条。
              </p>
              {mutation.data.failures.length > 0 ? (
                <div>
                  <p className="font-medium text-error">
                    失败 {mutation.data.failures.length} 行
                  </p>
                  <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto text-xs text-text-secondary">
                    {mutation.data.failures.map((f, idx) => (
                      <li key={`${f.row}-${idx}`}>
                        第 {f.row} 行：{f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {mutation.isError ? (
            <p className="text-sm text-error">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "导入失败"}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {mutation.isSuccess ? "关闭" : "取消"}
            </Button>
            {!mutation.isSuccess ? (
              <Button
                type="button"
                loading={mutation.isPending}
                disabled={!file}
                onClick={() => mutation.mutate()}
              >
                开始导入
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  mutation.reset();
                  resetState();
                }}
              >
                继续导入
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
