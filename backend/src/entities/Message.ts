import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, UpdateDateColumn } from 'typeorm';
import type { User } from './User.js';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  senderId!: number;

  @Column()
  recipientId!: number;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ default: false })
  isEdited!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @ManyToOne('User', 'sentMessages')
  sender!: User;

  @ManyToOne('User', 'receivedMessages')
  recipient!: User;

  constructor(partial?: Partial<Message>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
} 