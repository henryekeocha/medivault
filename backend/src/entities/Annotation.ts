import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import type { Image } from './Image.js';

@Entity()
export class Annotation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  imageId!: number;

  @Column('float')
  x!: number;

  @Column('float')
  y!: number;

  @Column()
  text!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne('Image', 'annotations')
  image!: Image;

  constructor(partial?: Partial<Annotation>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
} 