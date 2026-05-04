import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  @Public()
  @Get('ping')
  @ApiOperation({
    summary: '财务模块占位（无需鉴权；业务路由演进后按需改为 Bearer）',
  })
  ping() {
    return { ok: true, module: 'finance' };
  }
}
