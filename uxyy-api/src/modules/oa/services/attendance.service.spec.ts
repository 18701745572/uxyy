import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { DRIZZLE_DB } from '../../database/database.constants';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let mockDb: any;

  const mockAttendanceRecord = {
    id: 1,
    userId: 1,
    enterpriseId: 1,
    date: new Date('2024-01-15'),
    checkIn: new Date('2024-01-15T09:00:00'),
    checkOut: null,
    status: 'normal',
    workHours: 0,
    lateMinutes: 0,
    earlyMinutes: 0,
    location: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: DRIZZLE_DB,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIn', () => {
    it('should create check-in record successfully', async () => {
      // Mock select query
      const whereChain = {
        where: jest.fn().mockResolvedValue([]),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      // Mock insert query
      const returningChain = {
        returning: jest.fn().mockResolvedValue([mockAttendanceRecord]),
      };
      const valuesChain = {
        values: jest.fn().mockReturnValue(returningChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);
      mockDb.insert = jest.fn().mockReturnValue(valuesChain);

      const result = await service.checkIn(1, 1, 'in');

      expect(result.message).toContain('打卡');
      expect(result.record).toBeDefined();
    });

    it('should prevent duplicate check-in', async () => {
      const whereChain = {
        where: jest
          .fn()
          .mockResolvedValue([
            { ...mockAttendanceRecord, checkIn: new Date() },
          ]),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.checkIn(1, 1, 'in');

      expect(result.message).toContain('已经打过');
    });

    it('should create check-out record successfully', async () => {
      // Mock select query
      const whereChain = {
        where: jest.fn().mockResolvedValue([mockAttendanceRecord]),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      // Mock update query
      const returningChain = {
        returning: jest
          .fn()
          .mockResolvedValue([
            { ...mockAttendanceRecord, checkOut: new Date() },
          ]),
      };
      const whereUpdateChain = {
        where: jest.fn().mockReturnValue(returningChain),
      };
      const setChain = {
        set: jest.fn().mockReturnValue(whereUpdateChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);
      mockDb.update = jest.fn().mockReturnValue(setChain);

      const result = await service.checkIn(1, 1, 'out');

      expect(result.message).toContain('打卡');
    });
  });

  describe('getPersonalAttendance', () => {
    it('should return personal attendance records with stats', async () => {
      const orderByChain = {
        orderBy: jest.fn().mockResolvedValue([
          { ...mockAttendanceRecord, status: 'normal' },
          { ...mockAttendanceRecord, status: 'late', lateMinutes: 15 },
        ]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(orderByChain),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.getPersonalAttendance(
        1,
        '2024-01-01',
        '2024-01-31',
      );

      expect(result.records).toHaveLength(2);
      expect(result.stats).toBeDefined();
    });

    it('should handle empty attendance records', async () => {
      const orderByChain = {
        orderBy: jest.fn().mockResolvedValue([]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(orderByChain),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.getPersonalAttendance(
        1,
        '2024-01-01',
        '2024-01-31',
      );

      expect(result.records).toHaveLength(0);
      expect(result.stats.totalDays).toBe(0);
    });
  });
});
