declare global {
  namespace Express {
    interface UserPayload {
      userId: number;
      enterpriseId?: number;
      devBypass?: boolean;
    }

    type User = UserPayload;

    interface Request {
      user?: User;
    }
  }
}
export {};
