declare global {
  namespace Express {
    interface UserPayload {
      userId: number;
      enterpriseId?: number;
      devBypass?: boolean;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
