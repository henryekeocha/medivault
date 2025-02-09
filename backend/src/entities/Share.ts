import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import type { Image } from './Image.js';

@Entity()
export class Share {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  imageId!: number;

  @Column({ unique: true })
  token!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'text', nullable: true })
  recipientEmail!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne('Image', 'shares')
  image!: Image;

  constructor(partial?: Partial<Share>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
} 