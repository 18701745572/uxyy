import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';

// Mock API 模块
vi.mock('@/lib/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  switchEnterprise: vi.fn(),
  fetchAuthPermissions: vi.fn(() => Promise.resolve({ permissions: [] })),
}));

vi.mock('@/lib/api/token-store', () => ({
  readStoredAccessToken: vi.fn(),
  clearAllTokens: vi.fn(),
  persistRefreshToken: vi.fn(),
}));

vi.mock('@/lib/api/jwt-payload', () => ({
  readJwtAccessClaims: vi.fn(),
}));

import { login, register, fetchAuthPermissions } from '@/lib/api/auth';
import { readStoredAccessToken, clearAllTokens } from '@/lib/api/token-store';
import { readJwtAccessClaims } from '@/lib/api/jwt-payload';

describe('auth-store', () => {
  beforeEach(() => {
    // 重置 store 状态
    useAuthStore.setState({
      user: null,
      nickname: null,
      phone: null,
      permissions: [],
      canonicalRole: null,
      isLoading: false,
      isAuthenticated: false,
    });
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该具有正确的初始状态', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.nickname).toBeNull();
      expect(state.phone).toBeNull();
      expect(state.permissions).toEqual([]);
      expect(state.canonicalRole).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('登录成功后应该更新状态', async () => {
      const mockUser = {
        sub: 1,
        enterpriseId: 1,
        nickname: '测试用户',
        phone: '13800138000',
      };

      vi.mocked(login).mockResolvedValueOnce({
        access_token: 'mock_token',
        refresh_token: 'mock_refresh',
        user: mockUser,
      });

      vi.mocked(readStoredAccessToken).mockReturnValue('mock_token');
      vi.mocked(readJwtAccessClaims).mockReturnValue({
        sub: 1,
        enterpriseId: 1,
        role: 'boss',
        nickname: '测试用户',
        phone: '13800138000',
      });

      await useAuthStore.getState().login({
        phone: '13800138000',
        password: 'password123',
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.nickname).toBe('测试用户');
      expect(state.phone).toBe('13800138000');
      expect(state.canonicalRole).toBe('boss');
      expect(state.permissions.length).toBeGreaterThan(0);
    });

    it('登录失败应该抛出错误', async () => {
      vi.mocked(login).mockRejectedValueOnce(new Error('登录失败'));

      await expect(
        useAuthStore.getState().login({
          phone: '13800138000',
          password: 'wrong_password',
        })
      ).rejects.toThrow('登录失败');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('登出后应该清除状态', () => {
      // 先设置一个已登录状态
      useAuthStore.setState({
        user: { sub: 1, enterpriseId: 1 },
        nickname: '测试用户',
        phone: '13800138000',
        permissions: ['crm:read'],
        canonicalRole: 'boss',
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.nickname).toBeNull();
      expect(state.phone).toBeNull();
      expect(state.permissions).toEqual([]);
      expect(state.canonicalRole).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(clearAllTokens).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('注册成功后应该更新状态', async () => {
      const mockUser = {
        sub: 2,
        enterpriseId: 1,
        nickname: '新用户',
        phone: '13900139000',
      };

      vi.mocked(register).mockResolvedValueOnce({
        access_token: 'new_token',
        refresh_token: 'new_refresh',
        user: mockUser,
      });

      vi.mocked(readStoredAccessToken).mockReturnValue('new_token');
      vi.mocked(readJwtAccessClaims).mockReturnValue({
        sub: 2,
        enterpriseId: 1,
        role: 'sales',
        nickname: '新用户',
        phone: '13900139000',
      });

      await useAuthStore.getState().register({
        phone: '13900139000',
        password: 'password123',
        nickname: '新用户',
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.nickname).toBe('新用户');
      expect(state.canonicalRole).toBe('sales');
    });
  });

  describe('权限检查', () => {
    it('boss 角色应该拥有所有权限', async () => {
      vi.mocked(login).mockResolvedValueOnce({
        access_token: 'boss_token',
        refresh_token: 'boss_refresh',
        user: { sub: 1, enterpriseId: 1 },
      });

      vi.mocked(readStoredAccessToken).mockReturnValue('boss_token');
      vi.mocked(readJwtAccessClaims).mockReturnValue({
        sub: 1,
        enterpriseId: 1,
        role: 'boss',
      });

      await useAuthStore.getState().login({
        phone: '13800138000',
        password: 'password',
      });

      const state = useAuthStore.getState();
      expect(state.permissions).toContain('crm:read');
      expect(state.permissions).toContain('crm:write');
      expect(state.permissions).toContain('finance:read');
      expect(state.permissions).toContain('system:backup');
    });

    it('sales 角色应该只有销售相关权限', async () => {
      vi.mocked(login).mockResolvedValueOnce({
        access_token: 'sales_token',
        refresh_token: 'sales_refresh',
        user: { sub: 2, enterpriseId: 1 },
      });

      vi.mocked(readStoredAccessToken).mockReturnValue('sales_token');
      vi.mocked(readJwtAccessClaims).mockReturnValue({
        sub: 2,
        enterpriseId: 1,
        role: 'sales',
      });

      await useAuthStore.getState().login({
        phone: '13800138001',
        password: 'password',
      });

      const state = useAuthStore.getState();
      expect(state.permissions).toContain('crm:read');
      expect(state.permissions).toContain('crm:write');
      expect(state.permissions).not.toContain('finance:write');
      expect(state.permissions).not.toContain('system:backup');
    });
  });
});
