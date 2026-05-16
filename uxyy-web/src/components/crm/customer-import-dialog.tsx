"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importCustomers } from "@/lib/api/customers";

export function CustomerImportDialog() {
  return (
    <ImportDialog
      title="批量导入客户"
      description="请使用与客户列表导出 Excel / CSV 一致的表头（如「客户名称」「联系人」「电话」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。"
      importFn={importCustomers}
      refreshQueryKey={["crm", "customers"]}
      skipModeDescription="跳过重复（同企业下名称+电话已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
