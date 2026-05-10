"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { downloadExport, type ExportFormat, type ExportOptions } from "@/lib/api/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileSpreadsheet, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ExportMenuProps {
  type: ExportOptions["type"];
  filters?: Record<string, string>;
  filename?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  label?: string;
}

type ExportStatus = "idle" | "preparing" | "downloading" | "success" | "error";

export function ExportMenu({
  type,
  filters = {},
  filename,
  disabled = false,
  iconOnly = false,
  label = "导出",
}: ExportMenuProps) {
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: async (format: ExportFormat) => {
      setExportStatus("preparing");
      setErrorMessage(null);
      await downloadExport(
        { format, type, filters },
        filename ? `${filename}.${format === "excel" ? "xlsx" : "csv"}` : undefined
      );
      setExportStatus("success");
    },
    onError: (error) => {
      setExportStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "导出失败");
    },
  });

  const handleSelectFormat = (format: ExportFormat) => {
    setShowFormatDialog(true);
    exportMutation.mutate(format);
  };

  const handleCloseDialog = () => {
    setShowFormatDialog(false);
    if (exportStatus === "success" || exportStatus === "error") {
      setExportStatus("idle");
      setErrorMessage(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {iconOnly ? null : label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleSelectFormat("excel")} disabled={disabled}>
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
            导出 Excel
            <Badge variant="outline" className="ml-auto text-xs">.xlsx</Badge>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelectFormat("csv")} disabled={disabled}>
            <FileText className="w-4 h-4 mr-2 text-blue-600" />
            导出 CSV
            <Badge variant="outline" className="ml-auto text-xs">.csv</Badge>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showFormatDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportStatus === "idle" || exportStatus === "preparing" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  准备导出...
                </>
              ) : exportStatus === "downloading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  下载中...
                </>
              ) : exportStatus === "success" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  导出成功
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  导出失败
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            {exportStatus === "idle" || exportStatus === "preparing" || exportStatus === "downloading" ? (
              <>
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-pulse" />
                </div>
                <p className="text-sm text-zinc-600 text-center">
                  {exportStatus === "preparing"
                    ? "正在准备数据，请稍候..."
                    : "正在下载文件..."}
                </p>
              </>
            ) : exportStatus === "success" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm text-zinc-600 text-center">
                  文件已准备好，即将开始下载
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-sm text-red-600 text-center">
                  {errorMessage || "导出过程中出现错误"}
                </p>
              </>
            )}
          </div>

          <div className="flex justify-center">
            {(exportStatus === "success" || exportStatus === "error") && (
              <Button onClick={handleCloseDialog} variant="secondary">
                关闭
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ExportButton({
  type,
  filters = {},
  filename,
  disabled = false,
}: Omit<ExportMenuProps, "iconOnly" | "label">) {
  return (
    <ExportMenu
      type={type}
      filters={filters}
      filename={filename}
      disabled={disabled}
      iconOnly={false}
      label="导出"
    />
  );
}