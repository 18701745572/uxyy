import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../modules/auth/permissions.guard';
import { Permission } from '../../modules/auth/role-permissions';
import { Permissions } from '../decorators/permissions.decorator';
import { AuditLogService } from '../services/audit-log.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@ApiTags('audit')
@Controller('audit/logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly audit: AuditLogService) {}

  @Get()
  @Permissions(Permission.SYS_AUDIT_LOG)
  @ApiOperation({ summary: '分页查询本企业操作审计日志（变更类请求）' })
  async list(
    @Req() req: Request & { user: UserContext },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('method') method?: string,
    @Query('pathPrefix') pathPrefix?: string,
    @Query('userId') userIdRaw?: string,
  ) {
    const enterpriseId = req.user.enterpriseId;
    const parsed =
      userIdRaw !== undefined && userIdRaw !== ''
        ? Number(userIdRaw)
        : undefined;

    return this.audit.listForEnterprise({
      enterpriseId,
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      method: method ? method.toUpperCase() : undefined,
      pathPrefix,
      userId:
        parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined,
    });
  }
}
