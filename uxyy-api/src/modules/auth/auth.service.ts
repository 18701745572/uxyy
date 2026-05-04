import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly jwt: JwtService,
  ) {}

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

    return {
      access_token: accessToken,
      token_type: 'Bearer' as const,
      user: { id: user.id, phone: user.phone },
      enterprise: enterpriseId != null ? { id: enterpriseId } : null,
    };
  }
}
