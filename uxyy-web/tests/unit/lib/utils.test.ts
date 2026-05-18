import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatDistanceToNow } from '@/lib/utils';

describe('cn', () => {
  it('应该合并多个类名', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('应该处理条件类名', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('应该处理对象形式的类名', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });

  it('应该处理数组形式的类名', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('应该合并 Tailwind 冲突类名', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('应该过滤掉 falsy 值', () => {
    expect(cn('base', null, undefined, false, '', 'active')).toBe('base active');
  });
});

describe('formatCurrency', () => {
  it('应该正确格式化正数金额', () => {
    expect(formatCurrency(1234.56)).toBe('¥1,234.56');
  });

  it('应该正确格式化负数金额', () => {
    expect(formatCurrency(-1234.56)).toBe('-¥1,234.56');
  });

  it('应该正确格式化零', () => {
    expect(formatCurrency(0)).toBe('¥0.00');
  });

  it('应该正确格式化整数', () => {
    expect(formatCurrency(1000)).toBe('¥1,000.00');
  });

  it('应该正确格式化小数', () => {
    expect(formatCurrency(0.99)).toBe('¥0.99');
  });

  it('应该正确格式化大数字', () => {
    expect(formatCurrency(1000000)).toBe('¥1,000,000.00');
  });
});

describe('formatDistanceToNow', () => {
  it('应该显示"刚刚"', () => {
    const now = new Date().toISOString();
    expect(formatDistanceToNow(now)).toBe('刚刚');
  });

  it('应该显示"几分钟前"', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatDistanceToNow(fiveMinutesAgo)).toBe('5分钟前');
  });

  it('应该显示"几小时前"', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatDistanceToNow(threeHoursAgo)).toBe('3小时前');
  });

  it('应该显示"几天前"', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDistanceToNow(twoDaysAgo)).toBe('2天前');
  });

  it('应该显示"几周前"', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDistanceToNow(twoWeeksAgo)).toBe('2周前');
  });

  it('应该显示完整日期', () => {
    const oldDate = new Date('2023-01-15');
    const result = formatDistanceToNow(oldDate.toISOString());
    expect(result).toMatch(/^2023-01-15$/);
  });
});
