"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importCustomerCategories } from "@/lib/api/crm";

export function CustomerCategoryImportDialog() {
  return (
    <ImportDialog
      title="批量导入客户分类"
      description="请使用与客户分类列表导出 Excel / CSV 一致的表头（如「分类名称」「分类类型」「描述」「颜色」「排序」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。"
      importFn={importCustomerCategories}
      refreshQueryKey={["crm", "categories"]}
      skipModeDescription="跳过重复（同企业下分类名称已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
