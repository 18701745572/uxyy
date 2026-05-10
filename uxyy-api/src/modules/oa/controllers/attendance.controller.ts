import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../auth/role-permissions';
import { AttendanceService } from '../services/attendance.service';

interface UserContext {
  userId: number;
  enterpriseId?: number;
  role?: string;
}

function requireEnterprise(req: Request & { user: UserContext }): number {
  const e = req.user.enterpriseId;
  if (e == null || Number.isNaN(Number(e))) {
    throw new ForbiddenException('当前会话未绑定企业');
  }
  return Number(e);
}

@Controller('oa/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * 打卡
   */
  @Post('check-in')
  checkIn(
    @Req() req: Request & { user: UserContext },
    @Body('type') type: 'in' | 'out',
    @Body('location') location?: string,
  ) {
    const eid = requireEnterprise(req);
    return this.attendanceService.checkIn(req.user.userId, eid, type, location);
  }

  /**
   * 获取个人考勤记录
   */
  @Get('personal')
  getPersonalAttendance(
    @Req() req: Request & { user: UserContext },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getPersonalAttendance(req.user.userId, startDate, endDate);
  }

  /**
   * 本人补卡记录（与普通员工 POST make-up 同权，仅需登录 + 租户）
   * 须在 `GET make-up-requests` 之前声明，否则可能被误路由。
   */
  @Get('make-up-requests/mine')
  myMakeUpRequests(@Req() req: Request & { user: UserContext }) {
    const eid = requireEnterprise(req);
    return this.attendanceService.listMakeUpRequests(eid, undefined, {
      applicantUserId: req.user.userId,
    });
  }

  /**
   * 补卡申请列表（审批人查看本企业全员）：需 oa:approve
   */
  @Get('make-up-requests')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.OA_APPROVE)
  listMakeUpRequests(
    @Req() req: Request & { user: UserContext },
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    const eid = requireEnterprise(req);
    return this.attendanceService.listMakeUpRequests(eid, status);
  }

  /**
   * 获取部门考勤统计
   */
  @Get('department/:departmentId')
  getDepartmentAttendance(
    @Param('departmentId') departmentId: string,
    @Req() req: Request & { user: UserContext },
    @Query('month') month: string,
  ) {
    const eid = requireEnterprise(req);
    return this.attendanceService.getDepartmentAttendance(
      eid,
      departmentId,
      month,
    );
  }

  /**
   * 获取企业考勤概览
   */
  @Get('overview')
  getEnterpriseOverview(
    @Req() req: Request & { user: UserContext },
    @Query('date') date?: string,
  ) {
    const eid = requireEnterprise(req);
    return this.attendanceService.getEnterpriseOverview(eid, date);
  }

  /**
   * 补卡申请（员工）
   */
  @Post('make-up')
  requestMakeUp(
    @Req() req: Request & { user: UserContext },
    @Body('date') date: string,
    @Body('type') type: 'in' | 'out',
    @Body('reason') reason: string,
  ) {
    const eid = requireEnterprise(req);
    return this.attendanceService.requestMakeUp(
      req.user.userId,
      eid,
      date,
      type,
      reason,
    );
  }

  /**
   * 审批补卡申请
   */
  @Put('make-up/:requestId/approve')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.OA_APPROVE)
  approveMakeUp(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req: Request & { user: UserContext },
    @Body('approved') approved: boolean,
    @Body('remark') remark?: string,
  ) {
    const eid = requireEnterprise(req);
    return this.attendanceService.approveMakeUp(
      eid,
      requestId,
      req.user.userId,
      approved,
      remark,
    );
  }
}
