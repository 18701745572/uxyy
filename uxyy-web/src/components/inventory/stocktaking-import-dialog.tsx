"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importStocktaking } from "@/lib/api/stocktaking";

export function StocktakingImportDialog() {
  return (
    <ImportDialog
      title="批量导入盘点单"
      description="请使用与盘点单列表导出 Excel / CSV 一致的表头（如「盘点单号」「仓库ID」「状态」「备注」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。导入的盘点单默认为草稿状态。"
      importFn={importStocktaking}
      refreshQueryKey={["inventory", "stocktaking"]}
      skipModeDescription="跳过重复（同企业下盘点单号已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
