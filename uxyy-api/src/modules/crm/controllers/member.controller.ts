import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permission } from '../../auth/role-permissions';
import {
  MemberService,
  type CreateMemberLevelDto,
  type CreateCustomerMemberDto,
  type PointsOperationDto,
} from '../services/member.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('crm/members')
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  // ==================== 会员等级管理 ====================

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('levels')
  findAllLevels(@Req() req: Request & { user: UserContext }) {
    return this.memberService.findAllLevels(req.user.enterpriseId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('levels/:id')
  findLevelById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.findLevelById(id, req.user.enterpriseId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('levels')
  createLevel(
    @Req() req: Request & { user: UserContext },
    @Body() dto: CreateMemberLevelDto,
  ) {
    return this.memberService.createLevel(req.user.enterpriseId, dto);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Put('levels/:id')
  updateLevel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body() dto: Partial<CreateMemberLevelDto>,
  ) {
    return this.memberService.updateLevel(id, req.user.enterpriseId, dto);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_DELETE)
  @Delete('levels/:id')
  deleteLevel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.deleteLevel(id, req.user.enterpriseId);
  }

  @ApiBearerAuth()
  @Post('levels/import')
  @Permissions(Permission.CRM_WRITE)
  @ApiOperation({
    summary:
      'Excel/CSV 导入会员等级（与导出列对齐；mode=skip 跳过重复，mode=force 强制写入）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importLevels(
    @Req() req: Request & { user: UserContext },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('mode') modeRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传表格文件（xlsx / xls / csv）');
    }
    const mode = modeRaw === 'force' ? 'force' : 'skip';
    return this.memberService.importLevelsFromSpreadsheet(
      req.user.enterpriseId,
      file.buffer,
      mode,
    );
  }

  // ==================== 会员管理 ====================

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get()
  findAllMembers(
    @Req() req: Request & { user: UserContext },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('levelId', new ParseIntPipe({ optional: true })) levelId?: number,
    @Query('search') search?: string,
    @Query('keyword') keyword?: string,
  ) {
    const q = (search ?? keyword)?.trim();
    return this.memberService.findAllMembers(req.user.enterpriseId, {
      levelId,
      keyword: q || undefined,
      page,
      pageSize,
    });
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('customer/:customerId')
  findMemberByCustomerId(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.findMemberByCustomerId(
      customerId,
      req.user.enterpriseId,
    );
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post()
  createMember(
    @Req() req: Request & { user: UserContext },
    @Body() dto: CreateCustomerMemberDto,
  ) {
    return this.memberService.createMember(req.user.enterpriseId, dto);
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Put('customer/:customerId')
  updateMember(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
    @Body() dto: Partial<CreateCustomerMemberDto>,
  ) {
    return this.memberService.updateMember(
      customerId,
      req.user.enterpriseId,
      dto,
    );
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_DELETE)
  @Delete('customer/:customerId')
  deleteMember(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.deleteMember(customerId, req.user.enterpriseId);
  }

  // ==================== 积分管理 ====================

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('points/add')
  addPoints(
    @Req() req: Request & { user: UserContext },
    @Body() dto: PointsOperationDto,
  ) {
    return this.memberService.addPoints(req.user.enterpriseId, {
      ...dto,
      createdBy: req.user.userId,
    });
  }

  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('points/records/:customerId')
  getPointsRecords(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
    @Query('type') type?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.memberService.getPointsRecords(
      customerId,
      req.user.enterpriseId,
      {
        type,
        limit,
      },
    );
  }
}
