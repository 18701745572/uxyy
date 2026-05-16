"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importPurchaseOrders } from "@/lib/api/purchase-orders";

export function PurchaseOrderImportDialog() {
  return (
    <ImportDialog
      title="批量导入采购订单"
      description="请使用与采购订单列表导出 Excel / CSV 一致的表头（如「采购单号」「供应商ID」「状态」「备注」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。导入的采购订单默认为草稿状态。"
      importFn={importPurchaseOrders}
      refreshQueryKey={["inventory", "purchase-orders"]}
      skipModeDescription="跳过重复（同企业下采购单号已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
