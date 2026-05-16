"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importProducts } from "@/lib/api/products";

export function ProductImportDialog() {
  return (
    <ImportDialog
      title="批量导入商品"
      description="请使用与商品列表导出 Excel / CSV 一致的表头（如「商品编码」「商品名称」「规格」「单位」「销售单价」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。"
      importFn={importProducts}
      refreshQueryKey={["inventory", "products"]}
      skipModeDescription="跳过重复（同企业下商品编码已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
