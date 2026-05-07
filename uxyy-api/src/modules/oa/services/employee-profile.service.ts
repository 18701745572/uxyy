import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
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

  async create(enterpriseId: number, dto: CreateEmployeeProfileDto) {
    // 检查用户是否已存在档案
    const [existing] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(eq(schema.employeeProfiles.userId, dto.userId));

    if (existing) {
      throw new Error('该用户已存在员工档案');
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
}
