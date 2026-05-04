import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

export interface RegisterDto {
  phone: string;
  password: string;
  nickname?: string;
  enterpriseName?: string;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface ResetPasswordDto {
  phone: string;
  oldPassword: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly jwt: JwtService,
  ) {}

  // ========== 登录 ==========
  async login(phone: string, plainPassword: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, phone))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = user.passwordHash;
    if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
      throw new BadRequestException('User has no password hash');
    }

    const match = await bcrypt.compare(plainPassword, passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.db
      .select()
      .from(schema.userEnterprises)
      .where(eq(schema.userEnterprises.userId, user.id));

    const membership =
      memberships.find((m) => m.isDefault === true) ?? memberships[0];
    const enterpriseId = membership?.enterpriseId;

    const accessToken = await this.jwt.signAsync({
      sub: String(user.id),
      enterpriseId,
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: String(user.id), type: 'refresh' },
      { expiresIn: '30d' },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
      user: { id: user.id, phone: user.phone, nickname: user.nickname },
      enterprise: enterpriseId != null ? { id: enterpriseId } : null,
    };
  }

  // ========== 注册 ==========
  async register(dto: RegisterDto) {
    // 检查手机号是否已存在
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, dto.phone))
      .limit(1);

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 创建用户
    const [user] = await this.db
      .insert(schema.users)
      .values({
        phone: dto.phone,
        passwordHash,
        nickname: dto.nickname ?? null,
        status: 'active',
      })
      .returning();

    let enterpriseId: number | null = null;

    // 如果提供了企业名称，创建企业
    if (dto.enterpriseName) {
      const [enterprise] = await this.db
        .insert(schema.enterprises)
        .values({
          ownerId: user.id,
          name: dto.enterpriseName,
          status: 'active',
        })
        .returning();

      enterpriseId = enterprise.id;

      // 创建用户-企业关联
      await this.db.insert(schema.userEnterprises).values({
        userId: user.id,
        enterpriseId: enterprise.id,
        role: 'owner',
        isDefault: true,
      });
    }

    // 生成 Token
    const accessToken = await this.jwt.signAsync({
      sub: String(user.id),
      enterpriseId,
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: String(user.id), type: 'refresh' },
      { expiresIn: '30d' },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
      user: { id: user.id, phone: user.phone, nickname: user.nickname },
      enterprise: enterpriseId != null ? { id: enterpriseId } : null,
    };
  }

  // ========== Token 刷新 ==========
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = Number(payload.sub);
      if (Number.isNaN(userId)) {
        throw new UnauthorizedException('Invalid token');
      }

      // 检查用户是否存在
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // 获取企业信息
      const memberships = await this.db
        .select()
        .from(schema.userEnterprises)
        .where(eq(schema.userEnterprises.userId, user.id));

      const membership =
        memberships.find((m) => m.isDefault === true) ?? memberships[0];
      const enterpriseId = membership?.enterpriseId;

      // 生成新的 Access Token
      const accessToken = await this.jwt.signAsync({
        sub: String(user.id),
        enterpriseId,
      });

      const newRefreshToken = await this.jwt.signAsync(
        { sub: String(user.id), type: 'refresh' },
        { expiresIn: '30d' },
      );

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer' as const,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ========== 密码重置 ==========
  async resetPassword(dto: ResetPasswordDto) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, dto.phone))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 验证旧密码
    const match = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid old password');
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // 更新密码
    await this.db
      .update(schema.users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(schema.users.id, user.id));

    return { success: true, message: 'Password reset successfully' };
  }

  // ========== 获取当前用户信息 ==========
  async getProfile(userId: number) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        phone: schema.users.phone,
        nickname: schema.users.nickname,
        avatar: schema.users.avatar,
        status: schema.users.status,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 获取用户的企业列表
    const enterprises = await this.db
      .select({
        id: schema.enterprises.id,
        name: schema.enterprises.name,
        role: schema.userEnterprises.role,
        isDefault: schema.userEnterprises.isDefault,
      })
      .from(schema.userEnterprises)
      .innerJoin(
        schema.enterprises,
        eq(schema.userEnterprises.enterpriseId, schema.enterprises.id),
      )
      .where(eq(schema.userEnterprises.userId, userId));

    return {
      ...user,
      enterprises,
    };
  }

  // ========== 切换默认企业 ==========
  async switchEnterprise(userId: number, enterpriseId: number) {
    // 检查用户是否属于该企业
    const [membership] = await this.db
      .select()
      .from(schema.userEnterprises)
      .where(
        eq(schema.userEnterprises.userId, userId) &&
        eq(schema.userEnterprises.enterpriseId, enterpriseId),
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundException('Enterprise membership not found');
    }

    // 先将所有企业设为非默认
    await this.db
      .update(schema.userEnterprises)
      .set({ isDefault: false })
      .where(eq(schema.userEnterprises.userId, userId));

    // 将指定企业设为默认
    await this.db
      .update(schema.userEnterprises)
      .set({ isDefault: true })
      .where(
        eq(schema.userEnterprises.userId, userId) &&
        eq(schema.userEnterprises.enterpriseId, enterpriseId),
      );

    // 生成新的 Token
    const accessToken = await this.jwt.signAsync({
      sub: String(userId),
      enterpriseId,
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: String(userId), type: 'refresh' },
      { expiresIn: '30d' },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
    };
  }
}
