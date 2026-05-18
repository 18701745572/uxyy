import { describe, it, expect } from 'vitest';
import {
  UxyyRole,
  Permission,
  normalizeEnterpriseRole,
  getPermissionsFromEnterpriseRole,
  roleLabel,
} from '@/lib/permissions/role-matrix';

describe('normalizeEnterpriseRole', () => {
  it('应该正确识别 boss 角色', () => {
    expect(normalizeEnterpriseRole('boss')).toBe(UxyyRole.BOSS);
    expect(normalizeEnterpriseRole('BOSS')).toBe(UxyyRole.BOSS);
    expect(normalizeEnterpriseRole('Boss')).toBe(UxyyRole.BOSS);
  });

  it('应该将 owner 映射为 boss', () => {
    expect(normalizeEnterpriseRole('owner')).toBe(UxyyRole.BOSS);
    expect(normalizeEnterpriseRole('OWNER')).toBe(UxyyRole.BOSS);
  });

  it('应该将 admin 映射为 oa', () => {
    expect(normalizeEnterpriseRole('admin')).toBe(UxyyRole.OA);
    expect(normalizeEnterpriseRole('ADMIN')).toBe(UxyyRole.OA);
  });

  it('应该正确识别其他角色', () => {
    expect(normalizeEnterpriseRole('finance')).toBe(UxyyRole.FINANCE);
    expect(normalizeEnterpriseRole('sales')).toBe(UxyyRole.SALES);
    expect(normalizeEnterpriseRole('warehouse')).toBe(UxyyRole.WAREHOUSE);
    expect(normalizeEnterpriseRole('oa')).toBe(UxyyRole.OA);
  });

  it('应该处理带空格的输入', () => {
    expect(normalizeEnterpriseRole('  boss  ')).toBe(UxyyRole.BOSS);
    expect(normalizeEnterpriseRole('  finance  ')).toBe(UxyyRole.FINANCE);
  });

  it('应该对未知角色返回 undefined', () => {
    expect(normalizeEnterpriseRole('unknown')).toBeUndefined();
    expect(normalizeEnterpriseRole('administrator')).toBeUndefined();
  });

  it('应该对空值返回 undefined', () => {
    expect(normalizeEnterpriseRole('')).toBeUndefined();
    expect(normalizeEnterpriseRole(undefined)).toBeUndefined();
  });
});

describe('getPermissionsFromEnterpriseRole', () => {
  it('boss 应该拥有所有权限', () => {
    const perms = getPermissionsFromEnterpriseRole('boss');
    expect(perms).toContain(Permission.CRM_READ);
    expect(perms).toContain(Permission.CRM_WRITE);
    expect(perms).toContain(Permission.FIN_READ);
    expect(perms).toContain(Permission.FIN_WRITE);
    expect(perms).toContain(Permission.INV_READ);
    expect(perms).toContain(Permission.OA_READ);
    expect(perms).toContain(Permission.SYS_BACKUP);
  });

  it('finance 角色应该有财务相关权限', () => {
    const perms = getPermissionsFromEnterpriseRole('finance');
    expect(perms).toContain(Permission.FIN_READ);
    expect(perms).toContain(Permission.FIN_WRITE);
    expect(perms).toContain(Permission.FIN_VOUCHER);
    expect(perms).toContain(Permission.FIN_REPORT);
    expect(perms).not.toContain(Permission.CRM_WRITE);
    expect(perms).not.toContain(Permission.INV_WRITE);
  });

  it('sales 角色应该有销售相关权限', () => {
    const perms = getPermissionsFromEnterpriseRole('sales');
    expect(perms).toContain(Permission.CRM_READ);
    expect(perms).toContain(Permission.CRM_WRITE);
    expect(perms).toContain(Permission.CRM_DELETE);
    expect(perms).toContain(Permission.INV_SALES_ORDER);
    expect(perms).not.toContain(Permission.FIN_WRITE);
    expect(perms).not.toContain(Permission.INV_PURCHASE);
  });

  it('warehouse 角色应该有仓库相关权限', () => {
    const perms = getPermissionsFromEnterpriseRole('warehouse');
    expect(perms).toContain(Permission.INV_READ);
    expect(perms).toContain(Permission.INV_WRITE);
    expect(perms).toContain(Permission.INV_STOCK);
    expect(perms).toContain(Permission.INV_PURCHASE);
    expect(perms).not.toContain(Permission.CRM_WRITE);
    expect(perms).not.toContain(Permission.FIN_READ);
  });

  it('oa 角色应该有 OA 相关权限', () => {
    const perms = getPermissionsFromEnterpriseRole('oa');
    expect(perms).toContain(Permission.OA_READ);
    expect(perms).toContain(Permission.OA_APPROVE);
    expect(perms).toContain(Permission.OA_MANAGE);
    expect(perms).toContain(Permission.SYS_BACKUP);
    expect(perms).toContain(Permission.SYS_MEMBER);
    expect(perms).not.toContain(Permission.CRM_WRITE);
    expect(perms).not.toContain(Permission.FIN_WRITE);
  });

  it('未知角色应该返回空数组', () => {
    expect(getPermissionsFromEnterpriseRole('unknown')).toEqual([]);
    expect(getPermissionsFromEnterpriseRole('')).toEqual([]);
  });
});

describe('roleLabel', () => {
  it('应该返回正确的中文标签', () => {
    expect(roleLabel('boss')).toBe('老板');
    expect(roleLabel('finance')).toBe('财务');
    expect(roleLabel('sales')).toBe('销售');
    expect(roleLabel('warehouse')).toBe('仓管');
    expect(roleLabel('oa')).toBe('行政');
  });

  it('应该处理大写输入', () => {
    expect(roleLabel('BOSS')).toBe('老板');
    expect(roleLabel('FINANCE')).toBe('财务');
  });

  it('应该处理带空格的输入', () => {
    expect(roleLabel('  boss  ')).toBe('老板');
  });

  it('对未知角色应该返回原值', () => {
    expect(roleLabel('unknown')).toBe('unknown');
    expect(roleLabel('custom_role')).toBe('custom_role');
  });

  it('对空值应该返回"未知"', () => {
    expect(roleLabel('')).toBe('未知');
    expect(roleLabel(undefined)).toBe('未知');
  });
});
