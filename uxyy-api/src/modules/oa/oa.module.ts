import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import {
  ApprovalFlowController,
  LeaveRequestController,
  ExpenseRequestController,
  EmployeeProfileController,
} from './controllers';
import {
  ApprovalFlowService,
  LeaveRequestService,
  ExpenseRequestService,
  EmployeeProfileService,
} from './services';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { PriceMonitorService } from './services/price-monitor.service';
import { InsightGeneratorService } from './services/insight-generator.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { NotificationPushService } from './services/notification-push.service';

@Module({
  /** 仅依赖 Auth（守卫/JWT）；`DRIZZLE_DB` 来自全局 `DatabaseModule`，勿再 `import DatabaseModule` 以免与 Auth 形成环导致 `DatabaseModule === undefined` */
  imports: [
    forwardRef(() => AuthModule),
    ScheduleModule.forRoot(), // 启用定时任务
  ],
  controllers: [
    ApprovalFlowController,
    LeaveRequestController,
    ExpenseRequestController,
    EmployeeProfileController,
    NotificationController,
    AttendanceController,
  ],
  providers: [
    ApprovalFlowService,
    LeaveRequestService,
    ExpenseRequestService,
    EmployeeProfileService,
    NotificationService,
    AttendanceService,
    PriceMonitorService,
    InsightGeneratorService,
    NotificationSchedulerService,
    NotificationPushService,
  ],
  exports: [ApprovalFlowService, NotificationService, AttendanceService, NotificationPushService],
})
export class OaModule {}
