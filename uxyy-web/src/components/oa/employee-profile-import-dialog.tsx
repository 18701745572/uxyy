"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importEmployeeProfiles } from "@/lib/api/employee-profiles";

export function EmployeeProfileImportDialog() {
  return (
    <ImportDialog
      title="批量导入员工档案"
      description="请使用与员工档案列表导出 Excel / CSV 一致的表头（如「用户ID」「部门」「职位」「员工号」「电话」「邮箱」「入职日期」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。"
      importFn={importEmployeeProfiles}
      refreshQueryKey={["oa", "employee-profiles"]}
      skipModeDescription="跳过重复（同企业下员工号已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
