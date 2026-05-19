import {
  isValidPhone,
  isValidEmail,
  isValidEnterpriseName,
  isValidPassword,
  sanitizeString,
  parsePositiveInt,
  parsePositiveFloat,
  truncateString,
} from './validation.utils';

describe('Validation Utils', () => {
  describe('isValidPhone', () => {
    it('should return true for valid Chinese mobile numbers', () => {
      expect(isValidPhone('13800138000')).toBe(true);
      expect(isValidPhone('15900159000')).toBe(true);
      expect(isValidPhone('18600186000')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('1380013800')).toBe(false); // 10 digits
      expect(isValidPhone('138001380000')).toBe(false); // 12 digits
      expect(isValidPhone('1380013800a')).toBe(false); // contains letter
      expect(isValidPhone('23800138000')).toBe(false); // starts with 2
    });

    it('should handle edge cases', () => {
      expect(isValidPhone(null as any)).toBe(false);
      expect(isValidPhone(undefined as any)).toBe(false);
      expect(isValidPhone(13800138000 as any)).toBe(false); // number type
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('test')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@example')).toBe(false);
      expect(isValidEmail('test..test@example.com')).toBe(false);
    });
  });

  describe('isValidEnterpriseName', () => {
    it('should return true for valid enterprise names', () => {
      expect(isValidEnterpriseName('测试公司')).toBe(true);
      expect(isValidEnterpriseName('ABC科技有限公司')).toBe(true);
      expect(isValidEnterpriseName('北京-上海联合企业')).toBe(true);
    });

    it('should return false for invalid enterprise names', () => {
      expect(isValidEnterpriseName('')).toBe(false);
      expect(isValidEnterpriseName('   ')).toBe(false);
      expect(isValidEnterpriseName('a')).toBe(false); // too short
    });

    it('should handle boundary length', () => {
      expect(isValidEnterpriseName('a'.repeat(2))).toBe(true); // min length
      expect(isValidEnterpriseName('a'.repeat(100))).toBe(true); // max length
      expect(isValidEnterpriseName('a'.repeat(101))).toBe(false); // exceeds max
    });
  });

  describe('isValidPassword', () => {
    it('should return true for valid passwords', () => {
      expect(isValidPassword('Password123!')).toBe(true);
      expect(isValidPassword('MyP@ssw0rd')).toBe(true);
      expect(isValidPassword('Complex#Pass1')).toBe(true);
    });

    it('should return false for weak passwords', () => {
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword('12345678')).toBe(false); // only numbers
      expect(isValidPassword('password')).toBe(false); // only lowercase
      expect(isValidPassword('PASSWORD')).toBe(false); // only uppercase
      expect(isValidPassword('Pass123')).toBe(false); // too short
      expect(isValidPassword('Password')).toBe(false); // no number
    });

    it('should check minimum length', () => {
      expect(isValidPassword('Pass1!')).toBe(false); // 6 chars
      expect(isValidPassword('Passwo1!')).toBe(true); // 8 chars
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\t\nhello\t\n')).toBe('hello');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe(
        'scriptalert("xss")/script',
      );
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });

  describe('parsePositiveInt', () => {
    it('should parse valid positive integers', () => {
      expect(parsePositiveInt('123')).toBe(123);
      expect(parsePositiveInt('0')).toBe(0);
      expect(parsePositiveInt(456)).toBe(456);
    });

    it('should return default value for invalid input', () => {
      expect(parsePositiveInt('abc')).toBe(0);
      expect(parsePositiveInt('-10')).toBe(0);
      expect(parsePositiveInt('12.5')).toBe(0);
      expect(parsePositiveInt('')).toBe(0);
    });

    it('should use custom default value', () => {
      expect(parsePositiveInt('abc', 10)).toBe(10);
      expect(parsePositiveInt('', 5)).toBe(5);
    });

    it('should handle boundary values', () => {
      expect(parsePositiveInt('2147483647')).toBe(2147483647); // max int32
      // 实际实现支持更大的整数，所以 2147483648 会被正确解析
      expect(parsePositiveInt('2147483648')).toBe(2147483648);
    });
  });

  describe('parsePositiveFloat', () => {
    it('should parse valid positive floats', () => {
      expect(parsePositiveFloat('123.45')).toBe(123.45);
      expect(parsePositiveFloat('0')).toBe(0);
      expect(parsePositiveFloat(456.78)).toBe(456.78);
    });

    it('should return default value for invalid input', () => {
      expect(parsePositiveFloat('abc')).toBe(0);
      expect(parsePositiveFloat('-10.5')).toBe(0);
      expect(parsePositiveFloat('')).toBe(0);
    });

    it('should use custom default value', () => {
      expect(parsePositiveFloat('abc', 1.5)).toBe(1.5);
    });

    it('should handle precision', () => {
      expect(parsePositiveFloat('123.456789')).toBeCloseTo(123.456789, 5);
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('hello world', 5)).toBe('hello...');
      expect(truncateString('testing', 4)).toBe('test...');
    });

    it('should not truncate short strings', () => {
      expect(truncateString('hi', 10)).toBe('hi');
      expect(truncateString('hello', 10)).toBe('hello');
    });

    it('should handle exact length', () => {
      expect(truncateString('hello', 5)).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(truncateString('', 5)).toBe('');
    });

    it('should handle custom suffix', () => {
      expect(truncateString('hello world', 5, '>>')).toBe('hello>>');
    });
  });
});
