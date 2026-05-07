import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
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

@Module({
  imports: [DatabaseModule],
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
  ],
  exports: [ApprovalFlowService, NotificationService, AttendanceService],
})
export class OaModule {}
