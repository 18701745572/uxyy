"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importVouchers } from "@/lib/api/vouchers";

export function VoucherImportDialog() {
  return (
    <ImportDialog
      title="批量导入凭证"
      description="请使用与凭证列表导出 Excel / CSV 一致的表头（如「凭证号」「借方科目」「贷方科目」「金额」「摘要」「日期」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。导入的凭证默认为手工来源。"
      importFn={importVouchers}
      refreshQueryKey={["finance", "vouchers"]}
      skipModeDescription="跳过重复（同企业下凭证号已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
