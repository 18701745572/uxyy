import { ForbiddenException, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sum } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

export interface CreateVoucherEntryDto {
  subjectId: number;
  debit?: number;
  credit?: number;
  summary?: string;
}

@Injectable()
export class VoucherEntryService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ========== 创建凭证分录 ==========
  async createEntries(voucherId: number, entries: CreateVoucherEntryDto[]) {
    if (!entries || entries.length === 0) {
      throw new BadRequestException('凭证分录不能为空');
    }

    // 验证借贷平衡
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('借贷不平衡：借方合计必须等于贷方合计');
    }

    const voucherEntries = entries.map(entry => ({
      voucherId,
      subjectId: entry.subjectId,
      debit: entry.debit ? String(entry.debit) : '0',
      credit: entry.credit ? String(entry.credit) : '0',
      summary: entry.summary ?? null,
    }));

    const inserted = await this.db
      .insert(schema.voucherEntries)
      .values(voucherEntries)
      .returning();

    return inserted;
  }

  // ========== 获取凭证分录列表 ==========
  async findByVoucherId(voucherId: number) {
    const entries = await this.db
      .select({
        entry: schema.voucherEntries,
        subject: schema.accountSubjects,
      })
      .from(schema.voucherEntries)
      .leftJoin(schema.accountSubjects, eq(schema.voucherEntries.subjectId, schema.accountSubjects.id))
      .where(eq(schema.voucherEntries.voucherId, voucherId));

    return entries.map(({ entry, subject }) => ({
      id: entry.id,
      subjectId: entry.subjectId,
      subjectCode: subject?.code ?? '',
      subjectName: subject?.name ?? '未知科目',
      debit: Number(entry.debit),
      credit: Number(entry.credit),
      summary: entry.summary,
    }));
  }

  // ========== 更新凭证分录 ==========
  async updateEntry(entryId: number, dto: Partial<CreateVoucherEntryDto>) {
    const [existing] = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(eq(schema.voucherEntries.id, entryId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('凭证分录不存在');
    }

    const [updated] = await this.db
      .update(schema.voucherEntries)
      .set({
        subjectId: dto.subjectId ?? existing.subjectId,
        debit: dto.debit !== undefined ? String(dto.debit) : existing.debit,
        credit: dto.credit !== undefined ? String(dto.credit) : existing.credit,
        summary: dto.summary ?? existing.summary,
      })
      .where(eq(schema.voucherEntries.id, entryId))
      .returning();

    return updated;
  }

  // ========== 删除凭证分录 ==========
  async deleteEntry(entryId: number) {
    const [existing] = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(eq(schema.voucherEntries.id, entryId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('凭证分录不存在');
    }

    await this.db
      .delete(schema.voucherEntries)
      .where(eq(schema.voucherEntries.id, entryId));

    return { success: true };
  }

  // ========== 获取科目余额 ==========
  async getSubjectBalance(subjectId: number, startDate?: Date, endDate?: Date) {
    let query = this.db
      .select({
        totalDebit: sum(schema.voucherEntries.debit),
        totalCredit: sum(schema.voucherEntries.credit),
      })
      .from(schema.voucherEntries)
      .where(eq(schema.voucherEntries.subjectId, subjectId));

    const result = await query;
    
    const totalDebit = Number(result[0]?.totalDebit || 0);
    const totalCredit = Number(result[0]?.totalCredit || 0);

    return {
      subjectId,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
    };
  }
}
