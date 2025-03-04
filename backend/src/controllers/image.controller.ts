import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { prisma } from '../lib/prisma.js';
import { ImageStatus, ImageType } from '@prisma/client';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types/auth.js';
import { AnnotationType } from '@prisma/client';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Upload image
export const uploadImage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const { metadata, type = ImageType.OTHER } = req.body;
  const parsedMetadata = JSON.parse(metadata || '{}');

  // Generate unique S3 key
  const s3Key = `${req.user.id}/${Date.now()}-${req.file.originalname}`;

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
  const image = await prisma.image.create({
    data: {
      userId: req.user.id,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      type: type as ImageType,
      status: ImageStatus.PROCESSING,
      metadata: parsedMetadata,
      s3Key,
      s3Url,
      uploadDate: new Date(),
      processingStarted: new Date(),
    },
    include: {
      annotations: true,
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      image,
    },
  });
});

// Get all images for user
export const getImages = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const images = await prisma.image.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
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
export const getImage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const image = await prisma.image.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      annotations: true,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user.id) {
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
export const deleteImage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const image = await prisma.image.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user.id) {
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
  await prisma.image.delete({
    where: {
      id: req.params.id,
    },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Update image metadata
export const updateImageMetadata = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { metadata } = req.body;

  const image = await prisma.image.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  const updatedImage = await prisma.image.update({
    where: {
      id: req.params.id,
    },
    data: {
      metadata: JSON.parse(metadata),
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      image: updatedImage,
    },
  });
});

// Share image
export const shareImage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { expiresIn, recipientEmail } = req.body;

  const image = await prisma.image.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  // Generate share token
  const token = crypto.randomBytes(32).toString('hex');

  // Create share record
  const share = await prisma.share.create({
    data: {
      imageId: image.id,
      token,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      recipientEmail,
      sharedByUserId: req.user.id,
    },
  });

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

  const share = await prisma.share.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      image: true,
    },
  });

  if (!share) {
    throw new AppError('Share link invalid or expired', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      image: share.image,
    },
  });
});

// Add annotation
export const addAnnotation = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { x, y, text } = req.body;

  const image = await prisma.image.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  const annotation = await prisma.annotation.create({
    data: {
      imageId: image.id,
      content: JSON.stringify({ x, y, text }),
      coordinates: { x, y },
      userId: req.user.id,
      type: AnnotationType.TEXT,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      annotation,
    },
  });
});

// Get annotations
export const getAnnotations = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const image = await prisma.image.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      annotations: true,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user.id) {
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
export const deleteAnnotation = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const image = await prisma.image.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Check ownership
  if (image.userId !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  const annotation = await prisma.annotation.findUnique({
    where: {
      id: req.params.annotationId,
      imageId: image.id,
    },
  });

  if (!annotation) {
    throw new AppError('Annotation not found', 404);
  }

  await prisma.annotation.delete({
    where: {
      id: annotation.id,
    },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
}); 