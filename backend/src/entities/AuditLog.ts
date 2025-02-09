import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import type { User } from './User.js';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  action!: string;

  @Column('jsonb', { nullable: true })
  details!: Record<string, any> | null;

  @CreateDateColumn()
  timestamp!: Date;

  @ManyToOne('User', 'auditLogs')
  user!: User;

  constructor(partial?: Partial<AuditLog>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
} 