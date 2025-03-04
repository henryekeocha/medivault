import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/auth.js';
import { AnalyzeImageRequest, UpdateAnalysisRequest, AnalysisResult } from '../types/models.js';
import { ImageAnalysisService } from '../services/image-analysis.service.js';
import { AppError } from '../utils/appError.js';

const prisma = new PrismaClient();
const analysisService = new ImageAnalysisService();

// Validation schemas
const analyzeImageSchema = z.object({ 
  imageId: z.string(),
  analysisType: z.enum(['BASIC', 'ADVANCED', 'DIAGNOSTIC']),
  options: z.record(z.any()).optional()
});

const updateAnalysisSchema = z.object({
  findings: z.string(),
  diagnosis: z.string(),
  confidence: z.number(),
  metadata: z.record(z.any()).optional()
});

export const analyzeImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = analyzeImageSchema.parse(req.body);
    const { imageId, analysisType, options } = validatedData;

    // Get the image
    const image = await prisma.image.findUnique({
      where: { id: imageId }
    });

    if (!image) {
      throw new AppError('Image not found', 404);
    }

    // Perform the analysis
    const analysisResult = await analysisService.analyzeImage(imageId, req.user.id);

    // Convert findings to a serializable format
    const serializableFindings = analysisResult.findings.map(finding => ({
      type: finding.type,
      location: {
        x: finding.location.x,
        y: finding.location.y,
        width: finding.location.width,
        height: finding.location.height
      },
      confidence: finding.confidence,
      description: finding.description,
      severity: finding.severity,
      suggestedAction: finding.suggestedAction || null
    }));

    // Store the analysis result in the database using the image record
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        metadata: {
          ...(image.metadata as object || {}),
          analysis: {
            type: analysisType,
            findings: JSON.stringify(serializableFindings),
            confidence: analysisResult.confidence,
            processingTime: analysisResult.processingTime,
            modelVersion: analysisResult.modelVersion,
            createdAt: new Date().toISOString()
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ANALYSIS_CREATED',
        details: {
          imageId: image.id,
          analysisType,
          status: 'COMPLETED'
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        imageId: updatedImage.id,
        analysis: (updatedImage.metadata as any)?.analysis || {}
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalysis = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const image = await prisma.image.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!image || !(image.metadata as any)?.analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Check if user has access to this image
    if (
      req.user.id !== image.userId &&
      req.user.id !== image.patientId &&
      req.user.role !== Role.ADMIN
    ) {
      throw new AppError('You do not have permission to view this analysis', 403);
    }

    res.json({
      status: 'success',
      data: {
        imageId: image.id,
        analysis: (image.metadata as any).analysis
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAnalysis = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateAnalysisSchema.parse(req.body);
    const { findings, diagnosis, confidence, metadata } = validatedData;

    const image = await prisma.image.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!image || !(image.metadata as any)?.analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Only the provider who created the image or an admin can update it
    if (req.user.id !== image.userId && req.user.role !== Role.ADMIN) {
      throw new AppError('You do not have permission to update this analysis', 403);
    }

    const currentMetadata = image.metadata as any || {};
    const currentAnalysis = currentMetadata.analysis || {};

    const updatedImage = await prisma.image.update({
      where: {
        id: req.params.id
      },
      data: {
        metadata: {
          ...currentMetadata,
          analysis: {
            ...currentAnalysis,
            findings,
            diagnosis,
            confidence,
            additionalMetadata: metadata ? JSON.stringify(metadata) : null,
            updatedAt: new Date().toISOString()
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ANALYSIS_UPDATED',
        details: {
          imageId: updatedImage.id,
          changes: {
            findings,
            diagnosis,
            confidence
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        imageId: updatedImage.id,
        analysis: (updatedImage.metadata as any).analysis
      }
    });
  } catch (error) {
    next(error);
  }
}; 