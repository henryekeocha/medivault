import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/express.js';

// Get all shares for the current user
export const getShares = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const shares = await prisma.share.findMany({
    where: {
      OR: [
        { sharedByUserId: req.user.id },
        { sharedWithUserId: req.user.id }
      ]
    },
    include: {
      image: true,
      sharedByUser: true,
      sharedWithUser: true
    }
  });

  res.status(200).json({
    status: 'success',
    data: shares
  });
});

// Create a new share
export const createShare = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { imageId, sharedWithUserId, type, permissions, expiresAt } = req.body;

  // Verify image exists and user owns it
  const image = await prisma.image.findUnique({
    where: { id: imageId }
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  if (image.userId !== req.user.id) {
    throw new AppError('Not authorized to share this image', 403);
  }

  // Create the share
  const share = await prisma.share.create({
    data: {
      imageId,
      sharedWithUserId,
      type,
      permissions,
      expiresAt,
      sharedByUserId: req.user.id
    },
    include: {
      image: true,
      sharedByUser: true,
      sharedWithUser: true
    }
  });

  res.status(201).json({
    status: 'success',
    data: share
  });
});

// Revoke a share
export const revokeShare = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Find the share
  const share = await prisma.share.findUnique({
    where: { id }
  });

  if (!share) {
    throw new AppError('Share not found', 404);
  }

  // Verify user has permission to revoke
  if (share.sharedByUserId !== req.user.id) {
    throw new AppError('Not authorized to revoke this share', 403);
  }

  // Delete the share
  await prisma.share.delete({
    where: { id }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
}); 