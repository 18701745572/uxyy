"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importOpportunities } from "@/lib/api/crm";

export function OpportunityImportDialog() {
  return (
    <ImportDialog
      title="批量导入商机"
      description="请使用与商机列表导出 Excel / CSV 一致的表头（如「商机名称」「客户」「状态」「预计金额」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。"
      importFn={importOpportunities}
      refreshQueryKey={["crm", "opportunities"]}
      skipModeDescription="跳过重复（同企业下名称+客户已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
