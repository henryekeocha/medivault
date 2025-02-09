import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity()
export class SystemSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ default: 50 })
  maxUploadSize!: number;

  @Column({ default: '.jpg,.jpeg,.png,.pdf,.dicom' })
  allowedFileTypes!: string;

  @Column({ default: 30 })
  maxShareDuration!: number;

  @Column({ default: true })
  requireEmailVerification!: boolean;

  @Column({ default: true })
  enforcePasswordComplexity!: boolean;

  @Column({ default: true })
  enableAuditLog!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<SystemSettings>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
} 