import {
  ConflictException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type {
  CreateEmployeeProfileDto,
  UpdateEmployeeProfileDto,
  EmployeeProfileQueryDto,
} from '../dtos/employee-profile.dto';

@Injectable()
export class EmployeeProfileService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb
  ) {}

  async assertUserInEnterprise(enterpriseId: number, userId: number): Promise<void> {
    const [member] = await this.db
      .select({ id: schema.userEnterprises.id })
      .from(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.userId, userId),
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);
    if (!member) {
      throw new BadRequestException('所选用户不在本企业中，请先邀请其加入当前企业后再建档');
    }
  }

  async create(enterpriseId: number, dto: CreateEmployeeProfileDto) {
    await this.assertUserInEnterprise(enterpriseId, dto.userId);

    const [existing] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(eq(schema.employeeProfiles.userId, dto.userId));

    if (existing) {
      throw new ConflictException('该用户已存在员工档案');
    }

    const [profile] = await this.db
      .insert(schema.employeeProfiles)
      .values({
        userId: dto.userId,
        enterpriseId,
        department: dto.department,
        position: dto.position,
        employeeNo: dto.employeeNo,
        phone: dto.phone,
        email: dto.email,
        joinDate: dto.joinDate,
      })
      .returning();

    return profile;
  }

  async findAll(enterpriseId: number, query: EmployeeProfileQueryDto) {
    let conditions = eq(schema.employeeProfiles.enterpriseId, enterpriseId) as any;

    if (query.department) {
      conditions = and(conditions, eq(schema.employeeProfiles.department, query.department));
    }

    const profiles = await this.db
      .select({
        profile: schema.employeeProfiles,
        user: {
          id: schema.users.id,
          phone: schema.users.phone,
          nickname: schema.users.nickname,
          avatar: schema.users.avatar,
        },
      })
      .from(schema.employeeProfiles)
      .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
      .where(conditions);

    // 关键词搜索
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      return profiles.filter(
        (p) =>
          (p.user.nickname?.toLowerCase().includes(keyword) ?? false) ||
          (p.user.phone?.includes(keyword) ?? false) ||
          (p.profile.department?.toLowerCase().includes(keyword) ?? false) ||
          (p.profile.position?.toLowerCase().includes(keyword) ?? false)
      );
    }

    return profiles;
  }

  /** 本企业成员 + 是否已有通讯录档案（选人建档用） */
  async listEnterpriseMembers(enterpriseId: number) {
    const rows = await this.db
      .select({
        userId: schema.users.id,
        phone: schema.users.phone,
        nickname: schema.users.nickname,
        enterpriseRole: schema.userEnterprises.role,
        profileId: schema.employeeProfiles.id,
      })
      .from(schema.userEnterprises)
      .innerJoin(schema.users, eq(schema.users.id, schema.userEnterprises.userId))
      .leftJoin(
        schema.employeeProfiles,
        and(
          eq(schema.employeeProfiles.userId, schema.users.id),
          eq(schema.employeeProfiles.enterpriseId, enterpriseId),
        ),
      )
      .where(eq(schema.userEnterprises.enterpriseId, enterpriseId))
      .orderBy(asc(schema.users.id));

    return rows.map((r) => ({
      userId: r.userId,
      phone: r.phone,
      nickname: r.nickname,
      enterpriseRole: r.enterpriseRole,
      hasProfile: r.profileId != null,
    }));
  }

  async findById(id: number, enterpriseId: number) {
    const [result] = await this.db
      .select({
        profile: schema.employeeProfiles,
        user: {
          id: schema.users.id,
          phone: schema.users.phone,
          nickname: schema.users.nickname,
          avatar: schema.users.avatar,
        },
      })
      .from(schema.employeeProfiles)
      .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
      .where(and(eq(schema.employeeProfiles.id, id), eq(schema.employeeProfiles.enterpriseId, enterpriseId)));

    if (!result) throw new NotFoundException('员工档案不存在');
    return result;
  }

  async findByUserId(userId: number, enterpriseId: number) {
    const [result] = await this.db
      .select({
        profile: schema.employeeProfiles,
        user: {
          id: schema.users.id,
          phone: schema.users.phone,
          nickname: schema.users.nickname,
          avatar: schema.users.avatar,
        },
      })
      .from(schema.employeeProfiles)
      .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
      .where(
        and(
          eq(schema.employeeProfiles.userId, userId),
          eq(schema.employeeProfiles.enterpriseId, enterpriseId)
        )
      );

    return result;
  }

  async update(id: number, enterpriseId: number, dto: UpdateEmployeeProfileDto) {
    await this.findById(id, enterpriseId);

    const [updated] = await this.db
      .update(schema.employeeProfiles)
      .set({
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.employeeNo !== undefined && { employeeNo: dto.employeeNo }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.joinDate !== undefined && { joinDate: dto.joinDate }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.employeeProfiles.id, id), eq(schema.employeeProfiles.enterpriseId, enterpriseId)))
      .returning();

    return updated;
  }

  async delete(id: number, enterpriseId: number) {
    await this.findById(id, enterpriseId);

    await this.db
      .delete(schema.employeeProfiles)
      .where(and(eq(schema.employeeProfiles.id, id), eq(schema.employeeProfiles.enterpriseId, enterpriseId)));

    return { success: true };
  }

  // 获取部门列表
  async getDepartments(enterpriseId: number) {
    const results = await this.db
      .selectDistinct({ department: schema.employeeProfiles.department })
      .from(schema.employeeProfiles)
      .where(eq(schema.employeeProfiles.enterpriseId, enterpriseId));

    return results.map((r) => r.department).filter((d): d is string => d !== null && d !== undefined);
  }

  // Import employee profiles from spreadsheet
  async importFromSpreadsheet(
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
      用户ID: 'userId',
      userId: 'userId',
      部门: 'department',
      department: 'department',
      职位: 'position',
      position: 'position',
      员工号: 'employeeNo',
      employeeNo: 'employeeNo',
      电话: 'phone',
      phone: 'phone',
      邮箱: 'email',
      email: 'email',
      入职日期: 'joinDate',
      joinDate: 'joinDate',
      创建时间: '_ignore',
      createdAt: '_ignore',
    };

    let created = 0;
    let skipped = 0;
    const failures: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowIndex = i + 2;
      const raw = rawRows[i];
      const rowData: Record<string, string | number> = {};

      for (const [header, val] of Object.entries(raw)) {
        const key = HEADER_MAP[String(header).trim()];
        if (!key || key === '_ignore') continue;

        if (key === 'userId') {
          const n = Number(val);
          if (Number.isFinite(n)) rowData[key] = n;
          continue;
        }

        const str = val instanceof Date ? val.toISOString().slice(0, 10) : String(val).trim();
        if (!str) continue;

        rowData[key] = str;
      }

      const userId = Number(rowData['userId'] || 0);

      if (!userId || userId <= 0) {
        failures.push({ row: rowIndex, reason: '用户ID必填且必须为正整数' });
        continue;
      }

      // Check if user exists in enterprise
      const [member] = await this.db
        .select({ id: schema.userEnterprises.id })
        .from(schema.userEnterprises)
        .where(
          and(
            eq(schema.userEnterprises.userId, userId),
            eq(schema.userEnterprises.enterpriseId, enterpriseId),
          ),
        )
        .limit(1);

      if (!member) {
        failures.push({ row: rowIndex, reason: '所选用户不在本企业中' });
        continue;
      }

      // Check for duplicate profile
      if (mode === 'skip') {
        const [existing] = await this.db
          .select({ id: schema.employeeProfiles.id })
          .from(schema.employeeProfiles)
          .where(eq(schema.employeeProfiles.userId, userId))
          .limit(1);
        if (existing) {
          skipped++;
          continue;
        }
      }

      const department = String(rowData['department'] || '');
      const position = String(rowData['position'] || '');
      const employeeNo = String(rowData['employeeNo'] || '');
      const phone = String(rowData['phone'] || '');
      const email = String(rowData['email'] || '');
      const joinDate = String(rowData['joinDate'] || '');

      try {
        const [profile] = await this.db
          .insert(schema.employeeProfiles)
          .values({
            userId,
            enterpriseId,
            department: department || null,
            position: position || null,
            employeeNo: employeeNo || null,
            phone: phone || null,
            email: email || null,
            joinDate: joinDate || null,
          })
          .returning();

        if (profile) {
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
