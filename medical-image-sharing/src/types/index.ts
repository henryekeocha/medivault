import { Role, ImageStatus, SharePermission, AnnotationType } from '@prisma/client';
import type { User as PrismaUser, Image as PrismaImage, Share as PrismaShare, Annotation as PrismaAnnotation, Message as PrismaMessage, ChatSession as PrismaChatSession } from './prisma';

export type UserRole = Role;

// Frontend-specific types that extend Prisma types
export type User = Omit<PrismaUser, 'password' | 'twoFactorSecret'>;

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export type Image = PrismaImage;
export type Share = PrismaShare;
export type Annotation = PrismaAnnotation;

// Frontend-specific message type that includes only what we need
export interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  createdAt: Date;
  readAt?: Date;
  status: 'sent' | 'delivered' | 'read';
  attachments?: Array<{ 
    id: string;
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Frontend-specific chat session type that extends Prisma chat session
export interface ChatSession extends PrismaChatSession {
  participant: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    isOnline: boolean;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  status: 'active' | 'archived';
}

// Re-export enums from Prisma client
export { ImageStatus, SharePermission, AnnotationType };
