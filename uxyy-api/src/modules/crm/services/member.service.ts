import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc, sql, ilike, or, count } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface CreateMemberLevelDto {
  name: string;
  code: string;
  minPoints: number;
  maxPoints?: number;
  discountRate?: string;
  description?: string;
  benefits?: string[];
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface UpdateMemberLevelDto extends Partial<CreateMemberLevelDto> {}

export interface CreateCustomerMemberDto {
  customerId: number;
  memberNo?: string;
  levelId?: number;
  remark?: string;
}

export interface PointsOperationDto {
  customerId: number;
  points: number;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  sourceType?: string;
  sourceId?: number;
  description?: string;
  createdBy?: number;
}

@Injectable()
export class MemberService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ==================== 会员等级管理 ====================

  async findAllLevels(enterpriseId: number) {
    return this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.enterpriseId, enterpriseId),
          eq(schema.memberLevels.isDeleted, false),
        ),
      )
      .orderBy(schema.memberLevels.sortOrder);
  }

  async findLevelById(id: number, enterpriseId: number) {
    const [level] = await this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.id, id),
          eq(schema.memberLevels.enterpriseId, enterpriseId),
          eq(schema.memberLevels.isDeleted, false),
        ),
      );
    return level;
  }

  async createLevel(enterpriseId: number, dto: CreateMemberLevelDto) {
    // 如果设置为默认，取消其他默认等级
    if (dto.isDefault) {
      await this.db
        .update(schema.memberLevels)
        .set({ isDefault: false })
        .where(eq(schema.memberLevels.enterpriseId, enterpriseId));
    }

    const [level] = await this.db
      .insert(schema.memberLevels)
      .values({
        enterpriseId,
        ...dto,
      })
      .returning();

    return level;
  }

  async updateLevel(
    id: number,
    enterpriseId: number,
    dto: UpdateMemberLevelDto,
  ) {
    // 如果设置为默认，取消其他默认等级
    if (dto.isDefault) {
      await this.db
        .update(schema.memberLevels)
        .set({ isDefault: false })
        .where(
          and(
            eq(schema.memberLevels.enterpriseId, enterpriseId),
            sql`${schema.memberLevels.id} != ${id}`,
          ),
        );
    }

    const [level] = await this.db
      .update(schema.memberLevels)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.memberLevels.id, id),
          eq(schema.memberLevels.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return level;
  }

  async deleteLevel(id: number, enterpriseId: number) {
    const [level] = await this.db
      .update(schema.memberLevels)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.memberLevels.id, id),
          eq(schema.memberLevels.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return level;
  }

  // ==================== 客户会员管理 ====================

  async findAllMembers(
    enterpriseId: number,
    options?: {
      levelId?: number;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 10));
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(schema.customerMembers.enterpriseId, enterpriseId),
      eq(schema.customerMembers.isDeleted, false),
    ];

    if (options?.levelId) {
      conditions.push(eq(schema.customerMembers.levelId, options.levelId));
    }

    const kw = options?.keyword?.trim();
    if (kw) {
      const pattern = `%${kw}%`;
      conditions.push(
        or(
          ilike(schema.customers.name, pattern),
          ilike(schema.customerMembers.memberNo, pattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [countRow] = await this.db
      .select({ n: count() })
      .from(schema.customerMembers)
      .leftJoin(
        schema.customers,
        eq(schema.customerMembers.customerId, schema.customers.id),
      )
      .where(whereClause);

    const total = Number(countRow?.n ?? 0);

    const rows = await this.db
      .select({
        member: schema.customerMembers,
        customer: schema.customers,
        level: schema.memberLevels,
      })
      .from(schema.customerMembers)
      .leftJoin(
        schema.customers,
        eq(schema.customerMembers.customerId, schema.customers.id),
      )
      .leftJoin(
        schema.memberLevels,
        eq(schema.customerMembers.levelId, schema.memberLevels.id),
      )
      .where(whereClause)
      .orderBy(desc(schema.customerMembers.totalConsumption))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((r) => this.mapMemberRowToDto(r)),
      total,
      page,
      pageSize,
    };
  }

  async findMemberByCustomerId(customerId: number, enterpriseId: number) {
    const [result] = await this.db
      .select({
        member: schema.customerMembers,
        customer: schema.customers,
        level: schema.memberLevels,
      })
      .from(schema.customerMembers)
      .leftJoin(
        schema.customers,
        eq(schema.customerMembers.customerId, schema.customers.id),
      )
      .leftJoin(
        schema.memberLevels,
        eq(schema.customerMembers.levelId, schema.memberLevels.id),
      )
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
          eq(schema.customerMembers.isDeleted, false),
        ),
      );

    return result;
  }

  async createMember(enterpriseId: number, dto: CreateCustomerMemberDto) {
    // 检查客户是否存在
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, dto.customerId),
          eq(schema.customers.enterpriseId, enterpriseId),
        ),
      );

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 获取默认等级
    let levelId = dto.levelId;
    if (!levelId) {
      const [defaultLevel] = await this.db
        .select()
        .from(schema.memberLevels)
        .where(
          and(
            eq(schema.memberLevels.enterpriseId, enterpriseId),
            eq(schema.memberLevels.isDefault, true),
            eq(schema.memberLevels.isDeleted, false),
          ),
        );
      levelId = defaultLevel?.id;
    }

    // 生成会员卡号
    const memberNo =
      dto.memberNo || (await this.generateMemberNo(enterpriseId));

    const [member] = await this.db
      .insert(schema.customerMembers)
      .values({
        enterpriseId,
        customerId: dto.customerId,
        memberNo,
        levelId,
        remark: dto.remark,
      })
      .returning();

    return member;
  }

  async updateMember(
    customerId: number,
    enterpriseId: number,
    dto: Partial<CreateCustomerMemberDto>,
  ) {
    const [member] = await this.db
      .update(schema.customerMembers)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return member;
  }

  async deleteMember(customerId: number, enterpriseId: number) {
    const [member] = await this.db
      .update(schema.customerMembers)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return member;
  }

  // ==================== 积分管理 ====================

  async addPoints(enterpriseId: number, dto: PointsOperationDto) {
    // 获取会员信息
    const [member] = await this.db
      .select()
      .from(schema.customerMembers)
      .where(
        and(
          eq(schema.customerMembers.customerId, dto.customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      );

    if (!member) {
      throw new NotFoundException('会员不存在');
    }

    const beforePoints = member.availablePoints;
    const afterPoints = beforePoints + dto.points;

    // 创建积分记录
    const [record] = await this.db
      .insert(schema.pointsRecords)
      .values({
        enterpriseId,
        ...dto,
        beforePoints,
        afterPoints,
      })
      .returning();

    // 更新会员积分
    const updateData: any = {
      availablePoints: afterPoints,
      updatedAt: new Date(),
    };

    if (dto.points > 0) {
      updateData.totalPoints = member.totalPoints + dto.points;
    } else {
      updateData.usedPoints = member.usedPoints + Math.abs(dto.points);
    }

    await this.db
      .update(schema.customerMembers)
      .set(updateData)
      .where(eq(schema.customerMembers.id, member.id));

    // 检查是否需要升级会员等级
    await this.checkAndUpgradeLevel(member.id, enterpriseId);

    return record;
  }

  async getPointsRecords(
    customerId: number,
    enterpriseId: number,
    options?: { type?: string; limit?: number },
  ) {
    const conditions = [
      eq(schema.pointsRecords.customerId, customerId),
      eq(schema.pointsRecords.enterpriseId, enterpriseId),
    ];

    if (options?.type) {
      conditions.push(eq(schema.pointsRecords.type, options.type));
    }

    // 构建查询 - 注意：Drizzle ORM 链式调用顺序很重要
    const query = this.db
      .select()
      .from(schema.pointsRecords)
      .where(and(...conditions))
      .orderBy(desc(schema.pointsRecords.createdAt));

    // 应用 limit（如果提供）
    if (options?.limit) {
      return query.limit(options.limit);
    }

    return query;
  }

  // ==================== 辅助方法 ====================

  private mapMemberRowToDto(row: {
    member: typeof schema.customerMembers.$inferSelect;
    customer: typeof schema.customers.$inferSelect | null;
    level: typeof schema.memberLevels.$inferSelect | null;
  }) {
    const m = row.member;
    return {
      id: m.id,
      customerId: m.customerId,
      customerName: row.customer?.name ?? undefined,
      enterpriseId: m.enterpriseId,
      memberNo: m.memberNo ?? undefined,
      levelId: m.levelId ?? undefined,
      levelName: row.level?.name ?? undefined,
      levelCode: row.level?.code ?? undefined,
      totalPoints: m.totalPoints,
      availablePoints: m.availablePoints,
      usedPoints: m.usedPoints,
      balance: String(m.balance),
      totalConsumption: String(m.totalConsumption),
      orderCount: m.orderCount,
      joinDate: m.joinDate.toISOString?.() ?? String(m.joinDate),
      expireDate: m.expireDate
        ? (m.expireDate.toISOString?.() ?? String(m.expireDate))
        : undefined,
      lastConsumptionAt: m.lastConsumptionAt
        ? (m.lastConsumptionAt.toISOString?.() ?? String(m.lastConsumptionAt))
        : undefined,
      remark: m.remark ?? undefined,
      createdAt: m.createdAt.toISOString?.() ?? String(m.createdAt),
      updatedAt: m.updatedAt.toISOString?.() ?? String(m.updatedAt),
    };
  }

  private async generateMemberNo(enterpriseId: number): Promise<string> {
    const prefix = 'M';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${enterpriseId}${timestamp}${random}`;
  }

  private async checkAndUpgradeLevel(memberId: number, enterpriseId: number) {
    const [member] = await this.db
      .select()
      .from(schema.customerMembers)
      .where(eq(schema.customerMembers.id, memberId));

    if (!member) return;

    // 根据积分查找合适的等级
    const [newLevel] = await this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.enterpriseId, enterpriseId),
          eq(schema.memberLevels.isDeleted, false),
          sql`${schema.memberLevels.minPoints} <= ${member.totalPoints}`,
          sql`(${schema.memberLevels.maxPoints} IS NULL OR ${schema.memberLevels.maxPoints} >= ${member.totalPoints})`,
        ),
      )
      .orderBy(desc(schema.memberLevels.minPoints))
      .limit(1);

    if (newLevel && newLevel.id !== member.levelId) {
      await this.db
        .update(schema.customerMembers)
        .set({ levelId: newLevel.id, updatedAt: new Date() })
        .where(eq(schema.customerMembers.id, memberId));
    }
  }

  // 订单完成时更新会员消费统计
  async updateMemberConsumption(
    customerId: number,
    enterpriseId: number,
    orderAmount: number,
    pointsEarned: number,
  ) {
    const memberInfo = await this.findMemberByCustomerId(
      customerId,
      enterpriseId,
    );

    if (!memberInfo) {
      // 自动创建会员
      await this.createMember(enterpriseId, { customerId });
    }

    const [member] = await this.db
      .select()
      .from(schema.customerMembers)
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      );

    if (member) {
      await this.db
        .update(schema.customerMembers)
        .set({
          totalConsumption: sql`${schema.customerMembers.totalConsumption} + ${orderAmount}`,
          orderCount: sql`${schema.customerMembers.orderCount} + 1`,
          lastConsumptionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.customerMembers.id, member.id));

      // 添加消费积分
      if (pointsEarned > 0) {
        await this.addPoints(enterpriseId, {
          customerId,
          points: pointsEarned,
          type: 'earn',
          sourceType: 'order',
          description: `消费获得积分：${orderAmount}元`,
        });
      }

      // 检查等级升级
      await this.checkAndUpgradeLevel(member.id, enterpriseId);
    }
  }

  // Import member levels from spreadsheet
  async importLevelsFromSpreadsheet(
    enterpriseId: number,
    buffer: Buffer,
    mode: 'skip' | 'force',
  ): Promise<{
    created: number;
    skipped: number;
    failures: Array<{ row: number; reason: string }>;
  }> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('无法解析表格文件，请使用 xlsx/xls/csv');
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('表格为空');
    }
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      blankrows: false,
    });

    const HEADER_MAP: Record<string, string> = {
      等级名称: 'name',
      name: 'name',
      等级代码: 'code',
      code: 'code',
      最低积分: 'minPoints',
      minPoints: 'minPoints',
      最高积分: 'maxPoints',
      maxPoints: 'maxPoints',
      折扣率: 'discountRate',
      discountRate: 'discountRate',
      描述: 'description',
      description: 'description',
      颜色: 'color',
      color: 'color',
      排序: 'sortOrder',
      sortOrder: 'sortOrder',
      默认: 'isDefault',
      isDefault: 'isDefault',
      创建时间: '_ignore',
      createdAt: '_ignore',
    };

    let created = 0;
    let skipped = 0;
    const failures: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowIndex = i + 2;
      const raw = rawRows[i];
      const rowData: Record<string, string | number | boolean> = {};

      for (const [header, val] of Object.entries(raw)) {
        const key = HEADER_MAP[String(header).trim()];
        if (!key || key === '_ignore') continue;

        if (key === 'minPoints' || key === 'maxPoints' || key === 'sortOrder') {
          const n = Number(val);
          if (Number.isFinite(n)) rowData[key] = n;
          continue;
        }

        if (key === 'isDefault') {
          rowData[key] =
            String(val).toLowerCase() === 'true' ||
            String(val) === '是' ||
            String(val) === '1';
          continue;
        }

        const str =
          val instanceof Date
            ? val.toISOString().slice(0, 10)
            : String(val).trim();
        if (!str) continue;

        rowData[key] = str;
      }

      const name = String(rowData['name'] || '');
      const code = String(rowData['code'] || '');

      if (!name) {
        failures.push({ row: rowIndex, reason: '等级名称必填' });
        continue;
      }

      if (!code) {
        failures.push({ row: rowIndex, reason: '等级代码必填' });
        continue;
      }

      // Validate code
      const validCodes = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
      if (!validCodes.includes(code)) {
        failures.push({
          row: rowIndex,
          reason: '等级代码必须是 bronze/silver/gold/platinum/diamond 之一',
        });
        continue;
      }

      // Check for duplicate name
      if (mode === 'skip') {
        const existing = await this.db
          .select({ id: schema.memberLevels.id })
          .from(schema.memberLevels)
          .where(
            and(
              eq(schema.memberLevels.enterpriseId, enterpriseId),
              eq(schema.memberLevels.name, name),
              eq(schema.memberLevels.isDeleted, false),
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }
      }

      const minPoints = Number(rowData['minPoints'] || 0);
      const maxPoints = Number(rowData['maxPoints'] || 0) || undefined;
      const discountRate = String(rowData['discountRate'] || '100');
      const description = String(rowData['description'] || '');
      const color = String(rowData['color'] || '#999999');
      const sortOrder = Number(rowData['sortOrder'] || 0);
      const isDefault = Boolean(rowData['isDefault']);

      try {
        // If setting as default, unset other defaults first
        if (isDefault) {
          await this.db
            .update(schema.memberLevels)
            .set({ isDefault: false })
            .where(eq(schema.memberLevels.enterpriseId, enterpriseId));
        }

        const [level] = await this.db
          .insert(schema.memberLevels)
          .values({
            enterpriseId,
            name,
            code,
            minPoints,
            maxPoints,
            discountRate,
            description: description || null,
            color,
            sortOrder,
            isDefault,
          })
          .returning();

        if (level) {
          created++;
        }
      } catch (err) {
        failures.push({
          row: rowIndex,
          reason: err instanceof Error ? err.message : '创建失败',
        });
      }
    }

    return { created, skipped, failures };
  }
}
