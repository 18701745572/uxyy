"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { importMemberLevels } from "@/lib/api/crm";

export function MemberLevelImportDialog() {
  return (
    <ImportDialog
      title="批量导入会员等级"
      description="请使用与会员等级列表导出 Excel / CSV 一致的表头（如「等级名称」「等级代码」「最低积分」「最高积分」「折扣率」「描述」「颜色」等）。支持 .xlsx、.xls、.csv，单文件不超过 5MB。「创建时间」列会自动忽略。"
      importFn={importMemberLevels}
      refreshQueryKey={["crm", "member-levels"]}
      skipModeDescription="跳过重复（同企业下等级名称已存在则跳过该行，默认推荐）"
      forceModeDescription="强制写入（跳过服务端重复检测；若仍与已有数据冲突，该行可能失败）"
    />
  );
}
