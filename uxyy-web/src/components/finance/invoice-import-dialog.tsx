"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importInvoices } from "@/lib/api/invoices";

export function InvoiceImportDialog() {
  return (
    <ImportDialog
      title="批量导入发票"
      description="请使用与发票列表导出 Excel / CSV 一致的表头（如「发票号码」「发票代码」「发票类型」「金额」「税率」「税额」「价税合计」「购方名称」「销方名称」「状态」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「录入时间」列会自动忽略。导入的发票默认为未核验状态。"
      importFn={importInvoices}
      refreshQueryKey={["finance", "invoices"]}
      skipModeDescription="跳过重复（同企业下发票号码已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
