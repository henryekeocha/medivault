import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppDataSource } from '../config/database.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../middleware/errorHandler.js';
import { Image } from '../entities/Image.js';
import { Share } from '../entities/Share.js';
import { Annotation } from '../entities/Annotation.js';
import crypto from 'crypto';

const imageRepository = AppDataSource.getRepository(Image);
const shareRepository = AppDataSource.getRepository(Share);
const annotationRepository = AppDataSource.getRepository(Annotation);

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Upload image
export const uploadImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const { metadata } = req.body;
  const parsedMetadata = JSON.parse(metadata || '{}');

  // Generate unique S3 key
  const s3Key = `${req.user!.id}/${Date.now()}-${req.file.originalname}`;

  // Upload to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    })
  );

  // Generate signed URL
  const s3Url = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
    }),
    { expiresIn: 3600 * 24 * 7 } // 7 days
  );

  // Save to database
  const image = imageRepository.create({
    userId: req.user!.id,
    filename: req.file.originalname,
    s3Key,
    s3Url,
    metadata: parsedMetadata,
  });

  await imageRepository.save(image);

  res.status(201).json({
    status: 'success',
    data: {
      image,
    },
  });
});

// Get all images for user
export const getImages = catchAsync(async (req: Request, res: Response) => {
  const images = await imageRepository.find({
    where: {
      userId: req.user!.id,
    },
    relations: {
      annotations: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      images,
    },
  });
});

// Get single image
export const getImage = catchAsync(async (req: Request, res: Response) => {
  const image = await imageRepository.findOne({
    where: {
      id: parseInt(req.params.id),
    },
    relations: {
      annotations: true,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  res.status(200).json({
    status: 'success',
    data: {
      image,
    },
  });
});

// Delete image
export const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const image = await imageRepository.findOne({
    where: {
      id: parseInt(req.params.id),
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  // Delete from S3
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: image.s3Key,
    })
  );

  // Delete from database
  await imageRepository.remove(image);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Update image metadata
export const updateImageMetadata = catchAsync(async (req: Request, res: Response) => {
  const { metadata } = req.body;

  const image = await imageRepository.findOne({
    where: {
      id: parseInt(req.params.id),
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  image.metadata = JSON.parse(metadata);
  await imageRepository.save(image);

  res.status(200).json({
    status: 'success',
    data: {
      image,
    },
  });
});

// Share image
export const shareImage = catchAsync(async (req: Request, res: Response) => {
  const { expiresIn, recipientEmail } = req.body;

  const image = await imageRepository.findOne({
    where: {
      id: parseInt(req.params.id),
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  // Generate share token
  const token = crypto.randomBytes(32).toString('hex');

  // Create share record
  const share = shareRepository.create({
    imageId: image.id,
    token,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    recipientEmail,
  });

  await shareRepository.save(share);

  res.status(200).json({
    status: 'success',
    data: {
      share,
    },
  });
});

// Get shared image
export const getSharedImage = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params;

  const share = await shareRepository.findOne({
    where: {
      token,
    },
    relations: {
      image: true,
    },
  });

  if (!share) {
    throw new AppError('Invalid share token', 404);
  }

  if (share.expiresAt < new Date()) {
    throw new AppError('Share link has expired', 400);
  }

  res.status(200).json({
    status: 'success',
    data: {
      image: share.image,
    },
  });
});

// Add annotation
export const addAnnotation = catchAsync(async (req: Request, res: Response) => {
  const { x, y, text } = req.body;

  const image = await imageRepository.findOne({
    where: {
      id: parseInt(req.params.id),
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  const annotation = annotationRepository.create({
    imageId: image.id,
    x,
    y,
    text,
  });

  await annotationRepository.save(annotation);

  res.status(201).json({
    status: 'success',
    data: {
      annotation,
    },
  });
});

// Get annotations
export const getAnnotations = catchAsync(async (req: Request, res: Response) => {
  const image = await imageRepository.findOne({
    where: {
      id: parseInt(req.params.id),
    },
    relations: {
      annotations: true,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  res.status(200).json({
    status: 'success',
    data: {
      annotations: image.annotations,
    },
  });
});

// Delete annotation
export const deleteAnnotation = catchAsync(async (req: Request, res: Response) => {
  const image = await imageRepository.findOne({
    where: {
      id: parseInt(req.params.id),
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  const annotation = await annotationRepository.findOne({
    where: {
      id: parseInt(req.params.annotationId),
      imageId: image.id,
    },
  });

  if (!annotation) {
    throw new AppError('Annotation not found', 404);
  }

  await annotationRepository.remove(annotation);

  res.status(204).json({
    status: 'success',
    data: null,
  });
}); 