import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { EnterpriseMembersController } from './enterprise-members.controller';
import { EnterpriseMembersService } from './enterprise-members.service';
import { EnterpriseInvitationsService } from './enterprise-invitations.service';
import { PermissionsGuard } from './permissions.guard';

describe('EnterpriseMembersController', () => {
  let controller: EnterpriseMembersController;

  const service = {
    listMembers: jest.fn().mockResolvedValue([]),
    addMember: jest.fn().mockResolvedValue({}),
    updateMemberRole: jest.fn().mockResolvedValue({}),
    removeMember: jest.fn().mockResolvedValue({}),
  };

  const invitations = {
    createInvitation: jest.fn().mockResolvedValue({
      joinRelativePath: "/join?t=x",
      expiresAt: new Date().toISOString(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnterpriseMembersController],
      providers: [
        { provide: EnterpriseMembersService, useValue: service },
        { provide: EnterpriseInvitationsService, useValue: invitations },
        Reflector,
        PermissionsGuard,
      ],
    }).compile();

    controller = module.get<EnterpriseMembersController>(
      EnterpriseMembersController,
    );
    jest.clearAllMocks();
  });

  function mockReq(init: Partial<Express.UserPayload> = {}) {
    return {
      user: { userId: 12, enterpriseId: 42, role: 'boss', ...init },
    } as unknown as Request;
  }

  it('GET list resolves enterprise id from JWT', async () => {
    await controller.findAll(mockReq());
    expect(service.listMembers).toHaveBeenCalledWith(42);
  });

  it('GET list throws without enterprise on token', () => {
    expect(() =>
      controller.findAll(mockReq({ enterpriseId: undefined })),
    ).toThrow(ForbiddenException);
  });

  it('POST add delegates dto to service', async () => {
    await controller.add(mockReq(), {
      phone: '13900138901',
      role: 'finance',
    });
    expect(service.addMember).toHaveBeenCalledWith(
      42,
      '13900138901',
      'finance',
    );
  });

  it('POST invitations delegates to invitation service', async () => {
    await controller.createInvitation(mockReq(), {
      phone: '13900138901',
      role: 'sales',
    });
    expect(invitations.createInvitation).toHaveBeenCalledWith(
      42,
      12,
      '13900138901',
      'sales',
    );
  });
});
