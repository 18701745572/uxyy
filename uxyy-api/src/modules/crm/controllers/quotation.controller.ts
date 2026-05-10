import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permission } from '../../auth/role-permissions';
import {
  QuotationService,
  type CreateQuotationDto,
  type UpdateQuotationDto,
  type SendQuotationDto,
} from '../services/quotation.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('crm/quotations')
@UseGuards(JwtAuthGuard)
export class QuotationController {
  constructor(private readonly service: QuotationService) {}

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get()
  findPage(
    @Req() req: Request & { user: UserContext },
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('status') status?: string,
    @Query(
      'customerId',
      new ParseIntPipe({ optional: true }),
    ) customerId?: number,
  ) {
    return this.service.findPage({
      enterpriseId: req.user.enterpriseId,
      page: page ?? 1,
      pageSize: pageSize ?? 10,
      status,
      customerId,
    });
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.findOne(id, req.user.enterpriseId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post()
  create(
    @Body() dto: CreateQuotationDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.create(req.user.enterpriseId, dto, req.user.userId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.update(id, req.user.enterpriseId, dto);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_DELETE)
  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.delete(id, req.user.enterpriseId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post(':id/send')
  send(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendQuotationDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.send(id, req.user.enterpriseId, dto);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post(':id/accept')
  accept(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.updateStatus(id, req.user.enterpriseId, 'accepted');
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.updateStatus(id, req.user.enterpriseId, 'rejected');
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post(':id/convert-to-order')
  convertToSalesOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.convertToSalesOrder(
      id,
      req.user.enterpriseId,
      req.user.userId,
    );
  }
}
