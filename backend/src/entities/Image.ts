import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import type { User } from './User.js';
import type { Share } from './Share.js';
import type { Annotation } from './Annotation.js';

@Entity()
export class Image {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: 'text' })
  filename!: string;

  @Column({ type: 'text', unique: true })
  s3Key!: string;

  @Column({ type: 'text' })
  s3Url!: string;

  @Column('jsonb')
  metadata!: Record<string, any>;

  @Column('int', { nullable: true })
  size!: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  uploadedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne('User', 'images')
  user!: User;

  @OneToMany('Share', 'image')
  shares!: Share[];

  @OneToMany('Annotation', 'image')
  annotations!: Annotation[];

  constructor(partial?: Partial<Image>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
} 