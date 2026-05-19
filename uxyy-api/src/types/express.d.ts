import 'express';

declare global {
  namespace Express {
    interface UserPayload {
      userId: number;
      enterpriseId?: number;
      role?: string;
      devBypass?: boolean;
    }

    type User = UserPayload;

    interface Request {
      user?: User;
    }
  }
}

export {};
