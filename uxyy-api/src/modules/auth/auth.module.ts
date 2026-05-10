import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EnterpriseInvitationsService } from './enterprise-invitations.service';
import { EnterpriseMembersController } from './enterprise-members.controller';
import { EnterpriseMembersService } from './enterprise-members.service';
import { InvitationsController } from './invitations.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { resolveJwtAccessSecret } from './jwt-access-secret';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { OaModule } from '../oa/oa.module';

@Module({
  imports: [
    forwardRef(() => OaModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtAccessSecret(config),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '7d',
        } as JwtSignOptions,
      }),
    }),
  ],
  controllers: [
    AuthController,
    EnterpriseMembersController,
    InvitationsController,
  ],
  providers: [
    AuthService,
    EnterpriseMembersService,
    EnterpriseInvitationsService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    RolesGuard,
    PermissionsGuard,
    EnterpriseMembersService,
    EnterpriseInvitationsService,
  ],
})
export class AuthModule {}
