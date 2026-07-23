import { Role } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  role: Role | 'ADMIN' | 'USER';
  tenantId: string;
  plan?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
