import { Role } from '@prisma/client';

export const UserRole = Role;

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Session {
  user: User;
  expires: string;
} 