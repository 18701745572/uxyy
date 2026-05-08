import {
  Body,
  Controller,
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
import { AttendanceService } from '../services/attendance.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
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
    return this.attendanceService.checkIn(req.user.userId, req.user.enterpriseId, type, location);
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
   * 获取部门考勤统计
   */
  @Get('department/:departmentId')
  getDepartmentAttendance(
    @Param('departmentId') departmentId: string,
    @Req() req: Request & { user: UserContext },
    @Query('month') month: string,
  ) {
    return this.attendanceService.getDepartmentAttendance(req.user.enterpriseId, departmentId, month);
  }

  /**
   * 获取企业考勤概览
   */
  @Get('overview')
  getEnterpriseOverview(
    @Req() req: Request & { user: UserContext },
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getEnterpriseOverview(req.user.enterpriseId, date);
  }

  /**
   * 补卡申请
   */
  @Post('make-up')
  requestMakeUp(
    @Req() req: Request & { user: UserContext },
    @Body('date') date: string,
    @Body('type') type: 'in' | 'out',
    @Body('reason') reason: string,
  ) {
    return this.attendanceService.requestMakeUp(req.user.userId, req.user.enterpriseId, date, type, reason);
  }

  /**
   * 审批补卡申请
   */
  @Put('make-up/:requestId/approve')
  approveMakeUp(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req: Request & { user: UserContext },
    @Body('approved') approved: boolean,
    @Body('remark') remark?: string,
  ) {
    return this.attendanceService.approveMakeUp(requestId, req.user.userId, approved, remark);
  }
}
