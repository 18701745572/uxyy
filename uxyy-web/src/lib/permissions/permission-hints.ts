import { Permission, type PermissionCode } from "./role-matrix";

const HINT: Record<PermissionCode, string> = {
  [Permission.CRM_READ]: "浏览客户、商机、跟进等 CRM 数据",
  [Permission.CRM_WRITE]: "新建或编辑客户、商机、分类及导入等",
  [Permission.CRM_DELETE]: "删除客户、商机、跟进或分类",
  [Permission.INV_READ]: "查看商品、订单、库存与进销存报表",
  [Permission.INV_WRITE]: "维护商品、订单等进销存录入",
  [Permission.INV_STOCK]: "出入库、盘点等库存作业",
  [Permission.INV_PURCHASE]: "采购与入库相关操作",
  [Permission.INV_SALES_ORDER]: "销售订单与出库相关操作",
  [Permission.FIN_READ]: "查看发票、凭证与财务报表",
  [Permission.FIN_WRITE]: "录入发票、凭证等财务写操作",
  [Permission.FIN_VOUCHER]: "编制与管理记账凭证（凭证链路）",
  [Permission.FIN_REPORT]: "财务报表与经营分析",
  [Permission.OA_READ]: "查看 OA 与本人申请",
  [Permission.OA_APPROVE]: "处理请假、报销、补卡等审批",
  [Permission.OA_MANAGE]: "配置审批流程与员工通讯录等",
  [Permission.SYS_BACKUP]: "数据备份",
  [Permission.SYS_MEMBER]: "管理企业成员与邀请",
  [Permission.SYS_AUDIT_LOG]: "查看操作审计日志",
};

/** 用于无权页、帮助文案：权限码 → 简短中文说明 */
export function hintForPermissionCode(code: string): string {
  const c = code.trim() as PermissionCode;
  return HINT[c] ?? code;
}

/** 解析 `need=a,b,c` 查询串 */
export function parseNeedParam(need: string | null): string[] {
  if (!need?.trim()) return [];
  return need.split(",").map((s) => s.trim()).filter(Boolean);
}
