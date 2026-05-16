"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importSalesOrders } from "@/lib/api/sales-orders";

export function SalesOrderImportDialog() {
  return (
    <ImportDialog
      title="批量导入销售订单"
      description="请使用与销售订单列表导出 Excel / CSV 一致的表头（如「订单编号」「客户」「订单金额」「状态」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。注意：导入的订单默认为草稿状态。"
      importFn={importSalesOrders}
      refreshQueryKey={["inventory", "sales-orders"]}
      skipModeDescription="跳过重复（同企业下订单编号已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
