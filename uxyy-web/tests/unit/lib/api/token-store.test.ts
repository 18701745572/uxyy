import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readStoredAccessToken,
  readStoredRefreshToken,
  persistAccessToken,
  persistRefreshToken,
  persistTokens,
  clearStoredAccessToken,
  clearStoredRefreshToken,
  clearAllTokens,
} from '@/lib/api/token-store';

describe('token-store', () => {
  beforeEach(() => {
    // 清除 sessionStorage
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('readStoredAccessToken', () => {
    it('应该读取存储的访问令牌', () => {
      window.sessionStorage.setItem('uxyy_access_token', 'test_access_token');
      expect(readStoredAccessToken()).toBe('test_access_token');
    });

    it('没有令牌时应该返回 undefined', () => {
      expect(readStoredAccessToken()).toBeUndefined();
    });
  });

  describe('readStoredRefreshToken', () => {
    it('应该读取存储的刷新令牌', () => {
      window.sessionStorage.setItem('uxyy_refresh_token', 'test_refresh_token');
      expect(readStoredRefreshToken()).toBe('test_refresh_token');
    });

    it('没有令牌时应该返回 undefined', () => {
      expect(readStoredRefreshToken()).toBeUndefined();
    });
  });

  describe('persistAccessToken', () => {
    it('应该持久化访问令牌', () => {
      persistAccessToken('new_access_token');
      expect(window.sessionStorage.getItem('uxyy_access_token')).toBe('new_access_token');
    });
  });

  describe('persistRefreshToken', () => {
    it('应该持久化刷新令牌', () => {
      persistRefreshToken('new_refresh_token');
      expect(window.sessionStorage.getItem('uxyy_refresh_token')).toBe('new_refresh_token');
    });
  });

  describe('persistTokens', () => {
    it('应该同时持久化访问令牌和刷新令牌', () => {
      persistTokens('access_token', 'refresh_token');
      expect(window.sessionStorage.getItem('uxyy_access_token')).toBe('access_token');
      expect(window.sessionStorage.getItem('uxyy_refresh_token')).toBe('refresh_token');
    });
  });

  describe('clearStoredAccessToken', () => {
    it('应该清除访问令牌', () => {
      window.sessionStorage.setItem('uxyy_access_token', 'token');
      clearStoredAccessToken();
      expect(window.sessionStorage.getItem('uxyy_access_token')).toBeNull();
    });
  });

  describe('clearStoredRefreshToken', () => {
    it('应该清除刷新令牌', () => {
      window.sessionStorage.setItem('uxyy_refresh_token', 'token');
      clearStoredRefreshToken();
      expect(window.sessionStorage.getItem('uxyy_refresh_token')).toBeNull();
    });
  });

  describe('clearAllTokens', () => {
    it('应该清除所有令牌', () => {
      window.sessionStorage.setItem('uxyy_access_token', 'access');
      window.sessionStorage.setItem('uxyy_refresh_token', 'refresh');
      clearAllTokens();
      expect(window.sessionStorage.getItem('uxyy_access_token')).toBeNull();
      expect(window.sessionStorage.getItem('uxyy_refresh_token')).toBeNull();
    });
  });
});
