import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CrmService } from './crm.service';

class MockDb {
  private _idx = 0;

  constructor(private _results: unknown[]) {}

  private _next(): unknown {
    const v =
      this._idx < this._results.length
        ? this._results[this._idx]
        : this._results[this._results.length - 1];
    this._idx++;
    return v;
  }

  select(): this {
    return this;
  }
  from(): this {
    return this;
  }
  where(): this {
    return this;
  }
  limit(): this {
    return this;
  }
  offset(): this {
    return this;
  }
  orderBy(): this {
    return this;
  }
  groupBy(): this {
    return this;
  }
  insert(): this {
    return this;
  }
  values(): this {
    return this;
  }
  set(): this {
    return this;
  }
  update(): this {
    return this;
  }
  delete(): this {
    return this;
  }
  returning(): this {
    return this;
  }
  innerJoin(): this {
    return this;
  }
  leftJoin(): this {
    return this;
  }

  then(resolve: (v: unknown) => unknown) {
    return Promise.resolve(resolve(this._next()));
  }
}

describe('CrmService', () => {
  describe('checkDuplicate', () => {
    it('returns null when no duplicate found', async () => {
      const service = new CrmService(new MockDb([[]]) as any);
      const result = await service.checkDuplicate(1, 'test', '13800138000');
      expect(result).toBeNull();
    });

    it('returns duplicate id when found', async () => {
      const service = new CrmService(new MockDb([[{ id: 42 }]]) as any);
      const result = await service.checkDuplicate(1, 'test', '13800138000');
      expect(result).toBe(42);
    });
  });

  describe('create', () => {
    it('throws ConflictException when duplicate and not forced', async () => {
      const service = new CrmService(new MockDb([[{ id: 42 }]]) as any);
      await expect(
        service.create(1, { name: 'dup', phone: '13800138000', force: false }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows duplicate when forced', async () => {
      const now = new Date();
      const service = new CrmService(
        new MockDb([
          [
            {
              id: 1,
              enterpriseId: 1,
              name: 'test',
              phone: '13800138000',
              contactPerson: null,
              address: null,
              type: 'enterprise',
              level: 'regular',
              industry: null,
              tags: null,
              source: 'manual',
              assignedTo: null,
              creditLimit: null,
              remark: null,
              isDeleted: false,
              createdAt: now,
              updatedAt: now,
            },
          ],
        ]) as any,
      );
      const result = await service.create(1, {
        name: 'test',
        phone: '13800138000',
        force: true,
      });
      expect(result.name).toBe('test');
    });

    it('throws ForbiddenException without enterpriseId', async () => {
      const service = new CrmService(new MockDb([]) as any);
      await expect(
        service.create(undefined, { name: 'test', force: false }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('returns ok on soft delete', async () => {
      const now = new Date();
      const service = new CrmService(
        new MockDb([
          [
            {
              id: 1,
              enterpriseId: 1,
              name: 'test',
              phone: null,
              contactPerson: null,
              address: null,
              type: 'enterprise',
              level: 'regular',
              industry: null,
              tags: null,
              source: 'manual',
              assignedTo: null,
              creditLimit: null,
              remark: null,
              isDeleted: false,
              createdAt: now,
              updatedAt: now,
            },
          ],
          [{ id: 1 }],
        ]) as any,
      );
      const result = await service.remove(1, 1);
      expect(result.ok).toBe(true);
    });
  });

  describe('getOverviewStats', () => {
    it('returns stats overview', async () => {
      const service = new CrmService(
        new MockDb([
          [{ c: 10 }],
          [{ c: 3 }],
          [
            { type: 'enterprise', c: 7 },
            { type: 'personal', c: 3 },
          ],
          [
            { level: 'VIP', c: 2 },
            { level: 'regular', c: 8 },
          ],
        ]) as any,
      );
      const result = await service.getOverviewStats(1);
      expect(result.totalCustomers).toBe(10);
      expect(result.newThisMonth).toBe(3);
      expect(result.typeDistribution).toHaveLength(2);
    });
  });

  describe('getCustomerStats', () => {
    it('returns follow-up stats', async () => {
      const now = new Date();
      const service = new CrmService(
        new MockDb([
          [
            {
              id: 1,
              enterpriseId: 1,
              name: 'test',
              phone: null,
              contactPerson: null,
              address: null,
              type: 'enterprise',
              level: 'regular',
              industry: null,
              tags: null,
              source: 'manual',
              assignedTo: null,
              creditLimit: null,
              remark: null,
              isDeleted: false,
              createdAt: now,
              updatedAt: now,
            },
          ],
          [{ c: 5 }],
          [{ lastAt: now }],
        ]) as any,
      );
      const result = await service.getCustomerStats(1, 1);
      expect(result.followUpCount).toBe(5);
      expect(result.daysSinceLastFollowUp).toBe(0);
    });

    it('throws NotFoundException for non-existent customer', async () => {
      const service = new CrmService(new MockDb([[]]) as any);
      await expect(service.getCustomerStats(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
