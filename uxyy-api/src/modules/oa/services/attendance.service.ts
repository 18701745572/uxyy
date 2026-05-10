import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, gte, lte, lt, sql, asc, desc, inArray } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface AttendanceRecord {
  userId: number;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'overtime';
  workHours: number;
  lateMinutes: number;
  earlyMinutes: number;
}

export interface AttendanceStats {
  totalDays: number;
  normalDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeDays: number;
  totalWorkHours: number;
  totalLateMinutes: number;
  totalEarlyMinutes: number;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 打卡
   */
  async checkIn(userId: number, enterpriseId: number, type: 'in' | 'out', location?: string) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 检查今天是否已有记录
    const [existing] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.userId, userId),
          sql`DATE(${schema.attendanceRecords.date}) = ${today}`,
        ),
      );

    if (type === 'in') {
      // 上班打卡
      if (existing?.checkIn) {
        return { message: '今天已经打过上班卡了', record: existing };
      }

      // 判断是否迟到（假设9:00为上班时间）
      const checkInTime = now.getHours() * 60 + now.getMinutes();
      const workStartTime = 9 * 60; // 9:00
      const isLate = checkInTime > workStartTime;
      const lateMinutes = isLate ? checkInTime - workStartTime : 0;

      if (existing) {
        const [updated] = await this.db
          .update(schema.attendanceRecords)
          .set({
            checkIn: now,
            status: isLate ? 'late' : 'normal',
            lateMinutes,
          })
          .where(eq(schema.attendanceRecords.id, existing.id))
          .returning();
        return { message: isLate ? '已打卡，您迟到了' : '上班打卡成功', record: updated };
      } else {
        const [created] = await this.db
          .insert(schema.attendanceRecords)
          .values({
            userId,
            enterpriseId,
            date: now,
            checkIn: now,
            status: isLate ? 'late' : 'normal',
            lateMinutes,
            location,
          })
          .returning();
        return { message: isLate ? '已打卡，您迟到了' : '上班打卡成功', record: created };
      }
    } else {
      // 下班打卡
      if (!existing) {
        return { message: '请先打上班卡', record: null };
      }

      if (existing.checkOut) {
        return { message: '今天已经打过下班卡了', record: existing };
      }

      // 判断是否早退（假设18:00为下班时间）
      const checkOutTime = now.getHours() * 60 + now.getMinutes();
      const workEndTime = 18 * 60; // 18:00
      const isEarlyLeave = checkOutTime < workEndTime;
      const earlyMinutes = isEarlyLeave ? workEndTime - checkOutTime : 0;

      // 计算工作时长
      const checkInDate = existing.checkIn ? new Date(existing.checkIn) : null;
      const workHours = checkInDate ? (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60) : 0;

      // 更新状态
      let status = existing.status;
      if (isEarlyLeave) {
        status = existing.status === 'late' ? 'late' : 'early_leave';
      }

      const [updated] = await this.db
        .update(schema.attendanceRecords)
        .set({
          checkOut: now,
          status,
          earlyMinutes,
          workHours: workHours.toFixed(2),
        })
        .where(eq(schema.attendanceRecords.id, existing.id))
        .returning();

      return { message: isEarlyLeave ? '已打卡，您早退了' : '下班打卡成功', record: updated };
    }
  }

  /**
   * 获取个人考勤记录
   */
  async getPersonalAttendance(userId: number, startDate?: string, endDate?: string) {
    const conditions = [eq(schema.attendanceRecords.userId, userId)];

    if (startDate) {
      conditions.push(gte(schema.attendanceRecords.date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(schema.attendanceRecords.date, new Date(endDate)));
    }

    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(and(...conditions))
      .orderBy(asc(schema.attendanceRecords.date));

    // 统计
    const stats = this.calculateStats(records);

    return { records, stats };
  }

  /**
   * 获取部门考勤统计
   */
  async getDepartmentAttendance(enterpriseId: number, departmentId: string, month: string) {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // 获取部门员工
    const employees = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.enterpriseId, enterpriseId),
          eq(schema.employeeProfiles.department, departmentId),
        ),
      );

    const userIds = employees.map((e) => e.userId);

    if (userIds.length === 0) {
      return {
        month,
        departmentId,
        employeeCount: 0,
        userStats: {},
      };
    }

    // 获取考勤记录
    const records = await this.db
      .select({
        record: schema.attendanceRecords,
        user: schema.users,
      })
      .from(schema.attendanceRecords)
      .leftJoin(schema.users, eq(schema.attendanceRecords.userId, schema.users.id))
      .where(
        and(
          inArray(schema.attendanceRecords.userId, userIds),
          gte(schema.attendanceRecords.date, startDate),
          lt(schema.attendanceRecords.date, endDate),
        ),
      );

    // 按员工分组统计
    const userStats: Record<number, { name: string; stats: AttendanceStats }> = {};

    for (const userId of userIds) {
      const userRecords = records
        .filter(r => r.record.userId === userId)
        .map(r => r.record);
      const user = records.find(r => r.record.userId === userId)?.user;

      userStats[userId] = {
        name: user?.nickname || user?.phone || `员工${userId}`,
        stats: this.calculateStats(userRecords),
      };
    }

    return {
      month,
      departmentId,
      employeeCount: employees.length,
      userStats,
    };
  }

  /**
   * 获取企业考勤概览
   */
  async getEnterpriseOverview(enterpriseId: number, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 获取企业员工总数
    const [employeeCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.employeeProfiles)
      .where(eq(schema.employeeProfiles.enterpriseId, enterpriseId));

    // 获取今日打卡情况
    const todayRecords = await this.db
      .select({
        record: schema.attendanceRecords,
        user: schema.users,
      })
      .from(schema.attendanceRecords)
      .leftJoin(schema.users, eq(schema.attendanceRecords.userId, schema.users.id))
      .where(
        and(
          eq(schema.attendanceRecords.enterpriseId, enterpriseId),
          sql`DATE(${schema.attendanceRecords.date}) = ${targetDate}`,
        ),
      );

    const checkedIn = todayRecords.filter(r => r.record.checkIn).length;
    const checkedOut = todayRecords.filter(r => r.record.checkOut).length;
    const late = todayRecords.filter(r => r.record.status === 'late').length;
    const totalEmp = Number(employeeCount?.count ?? 0);
    const absent = Math.max(0, totalEmp - checkedIn);

    return {
      date: targetDate,
      totalEmployees: totalEmp,
      checkedIn,
      checkedOut,
      late,
      absent,
      checkInRate: totalEmp ? ((checkedIn / totalEmp) * 100).toFixed(2) : '0',
      details: todayRecords.map(({ record, user }) => ({
        userId: record.userId,
        userName: user?.nickname || user?.phone,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
      })),
    };
  }

  /**
   * 补卡申请
   */
  async requestMakeUp(
    userId: number,
    enterpriseId: number,
    date: string,
    type: 'in' | 'out',
    reason: string,
  ) {
    const [request] = await this.db
      .insert(schema.attendanceMakeUpRequests)
      .values({
        userId,
        enterpriseId,
        date: new Date(date),
        type,
        reason,
        status: 'pending',
      })
      .returning();

    return request;
  }

  /**
   * 补卡申请列表（本企业）。
   * - 审批端：不传 applicantUserId，可选 status。
   * - 个人端：`applicantUserId` 限定为本人，不传 status 则返回各状态。
   */
  async listMakeUpRequests(
    enterpriseId: number,
    status?: 'pending' | 'approved' | 'rejected',
    options?: { applicantUserId?: number },
  ) {
    const conditions = [
      eq(schema.attendanceMakeUpRequests.enterpriseId, enterpriseId),
    ];
    if (status) {
      conditions.push(eq(schema.attendanceMakeUpRequests.status, status));
    }
    if (options?.applicantUserId != null) {
      conditions.push(
        eq(schema.attendanceMakeUpRequests.userId, options.applicantUserId),
      );
    }

    const rows = await this.db
      .select({
        request: schema.attendanceMakeUpRequests,
        applicantNickname: schema.users.nickname,
        applicantPhone: schema.users.phone,
      })
      .from(schema.attendanceMakeUpRequests)
      .leftJoin(
        schema.users,
        eq(schema.attendanceMakeUpRequests.userId, schema.users.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.attendanceMakeUpRequests.createdAt));

    return rows.map((r) => ({
      id: r.request.id,
      userId: r.request.userId,
      enterpriseId: r.request.enterpriseId,
      date: r.request.date.toISOString(),
      type: r.request.type,
      reason: r.request.reason,
      status: r.request.status,
      approverId: r.request.approverId,
      approvedAt: r.request.approvedAt?.toISOString() ?? null,
      remark: r.request.remark,
      createdAt: r.request.createdAt.toISOString(),
      applicantName:
        r.applicantNickname?.trim() ||
        r.applicantPhone?.trim() ||
        `用户${r.request.userId}`,
    }));
  }

  /**
   * 审批补卡申请（须与本企业数据一致）
   */
  async approveMakeUp(
    enterpriseId: number,
    requestId: number,
    approverId: number,
    approved: boolean,
    remark?: string,
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.attendanceMakeUpRequests)
      .where(
        and(
          eq(schema.attendanceMakeUpRequests.id, requestId),
          eq(schema.attendanceMakeUpRequests.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('补卡申请不存在或无权操作');
    }
    if (existing.status !== 'pending') {
      throw new BadRequestException('该申请已处理');
    }

    const status = approved ? 'approved' : 'rejected';

    const [updated] = await this.db
      .update(schema.attendanceMakeUpRequests)
      .set({
        status,
        approverId,
        approvedAt: new Date(),
        remark,
      })
      .where(
        and(
          eq(schema.attendanceMakeUpRequests.id, requestId),
          eq(schema.attendanceMakeUpRequests.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    // 如果审批通过，更新考勤记录
    if (approved && existing) {
      const dateStr = existing.date.toISOString().split('T')[0];
      const [record] = await this.db
        .select()
        .from(schema.attendanceRecords)
        .where(
          and(
            eq(schema.attendanceRecords.userId, existing.userId),
            sql`DATE(${schema.attendanceRecords.date}) = ${dateStr}`,
          ),
        );

      if (record) {
        const updateData: Record<string, unknown> = {};
        if (existing.type === 'in') {
          updateData.checkIn = existing.date;
        } else {
          updateData.checkOut = existing.date;
        }
        await this.db
          .update(schema.attendanceRecords)
          .set(updateData)
          .where(eq(schema.attendanceRecords.id, record.id));
      }
    }

    return updated;
  }

  /**
   * 计算考勤统计
   */
  private calculateStats(records: (typeof schema.attendanceRecords.$inferSelect)[]): AttendanceStats {
    const stats: AttendanceStats = {
      totalDays: records.length,
      normalDays: 0,
      lateDays: 0,
      earlyLeaveDays: 0,
      absentDays: 0,
      leaveDays: 0,
      overtimeDays: 0,
      totalWorkHours: 0,
      totalLateMinutes: 0,
      totalEarlyMinutes: 0,
    };

    for (const record of records) {
      switch (record.status) {
        case 'normal':
          stats.normalDays++;
          break;
        case 'late':
          stats.lateDays++;
          break;
        case 'early_leave':
          stats.earlyLeaveDays++;
          break;
        case 'absent':
          stats.absentDays++;
          break;
        case 'leave':
          stats.leaveDays++;
          break;
        case 'overtime':
          stats.overtimeDays++;
          break;
      }

      stats.totalWorkHours += parseFloat(record.workHours || '0');
      stats.totalLateMinutes += record.lateMinutes || 0;
      stats.totalEarlyMinutes += record.earlyMinutes || 0;
    }

    return stats;
  }
}
