import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { SystemSettings } from '../entities/SystemSettings.js';
import { Image } from '../entities/Image.js';
import { Message } from '../entities/Message.js';
import { AuditLog } from '../entities/AuditLog.js';
import { Share } from '../entities/Share.js';
import { Annotation } from '../entities/Annotation.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'medical_imaging',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, SystemSettings, Image, Message, AuditLog, Share, Annotation],
  migrations: [],
  subscribers: [],
}); 