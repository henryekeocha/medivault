import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import type { Image } from './Image.js';
import type { Message } from './Message.js';
import type { AuditLog } from './AuditLog.js';

export enum UserRole {
  Patient = 'Patient',
  Provider = 'Provider',
  Admin = 'Admin'
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  username!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'text' })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.Patient
  })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  twoFactorSecret!: string | null;

  @Column({ default: false })
  twoFactorEnabled!: boolean;

  @Column('text', { array: true, nullable: true })
  backupCodes!: string[] | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany('Image', 'user')
  images!: Image[];

  @OneToMany('Message', 'sender')
  sentMessages!: Message[];

  @OneToMany('Message', 'recipient')
  receivedMessages!: Message[];

  @OneToMany('AuditLog', 'user')
  auditLogs!: AuditLog[];

  constructor(partial?: Partial<User>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
} 