import { AppError } from '../utils/appError.js';
import { OpenAI } from 'openai';
import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { prisma } from '../lib/prisma.js';
import type { Image, AuditLog } from '@prisma/client';

interface AnalysisResult {
  findings: Finding[];
  confidence: number;
  processingTime: number;
  modelVersion: string;
  tfPredictions?: {
    label: string;
    probability: number;
  }[];
  error?: string;
}

interface Finding {
  type: 'anomaly' | 'measurement' | 'classification';
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

const SUPPORTED_SCAN_TYPES = ['xray', 'mri', 'ct', 'ultrasound'] as const;
type ScanType = typeof SUPPORTED_SCAN_TYPES[number];

export class ImageAnalysisService {
  private openai: OpenAI;
  private models: Map<string, tf.GraphModel>;
  private readonly MODEL_VERSION = 'v1.1-hybrid';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.models = new Map();
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      for (const scanType of SUPPORTED_SCAN_TYPES) {
        const model = await tf.loadGraphModel(`file://models/${scanType}/model.json`);
        this.models.set(scanType, model);
      }
    } catch (error) {
      console.error('Error initializing models:', error);
      throw new AppError('Failed to initialize analysis models', 500);
    }
  }

  public async analyzeImage(imageId: string, userId: string): Promise<AnalysisResult> {
    try {
      const startTime = Date.now();

      // Get image from database using Prisma
      const image = await prisma.image.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new AppError('Image not found', 404);
      }

      // Get image data from S3 URL
      const imageBuffer = await fetch(image.s3Url).then(res => res.arrayBuffer());

      // Preprocess image
      const { buffer, tensor } = await this.preprocessImage(Buffer.from(imageBuffer));

      // Get scan type from metadata
      const scanType = (image.metadata as any)?.scanType as ScanType;
      if (!scanType || !SUPPORTED_SCAN_TYPES.includes(scanType)) {
        throw new AppError('Invalid or missing scan type', 400);
      }

      // Run TensorFlow analysis
      const tfPredictions = await this.runTensorflowAnalysis(tensor, scanType);

      // Run AI analysis
      const findings = await this.analyzeWithAI(buffer, scanType, tfPredictions);

      // Calculate confidence
      const confidence = this.calculateOverallConfidence(findings);

      // Create analysis result
      const result: AnalysisResult = {
        findings,
        confidence,
        processingTime: Date.now() - startTime,
        modelVersion: this.MODEL_VERSION,
        tfPredictions: tfPredictions ? Array.from(await tfPredictions.data()).map((prob, idx) => ({
          label: `class_${idx}`,
          probability: prob as number
        })) : undefined
      };

      // Log the analysis using Prisma
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'IMAGE_ANALYSIS',
          details: {
            confidence,
            findingsCount: findings.length,
            processingTime: result.processingTime
          }
        }
      });

      return result;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new AppError('Failed to analyze image', 500);
    }
  }

  public async batchAnalyze(imageIds: string[], userId: string): Promise<Map<string, AnalysisResult>> {
    const results = new Map<string, AnalysisResult>();
    
    await Promise.all(imageIds.map(async (imageId) => {
      try {
        const result = await this.analyzeImage(imageId, userId);
        results.set(imageId, result);
      } catch (error) {
        console.error(`Error analyzing image ${imageId}:`, error);
        results.set(imageId, {
          findings: [],
          confidence: 0,
          processingTime: 0,
          modelVersion: this.MODEL_VERSION,
          error: error instanceof AppError ? error.message : 'Unknown error occurred'
        });
      }
    }));

    return results;
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<{ buffer: Buffer; tensor: tf.Tensor4D }> {
    try {
      const image = await sharp(imageBuffer)
        .resize(224, 224)
        .normalize()
        .toBuffer();

      // Convert buffer to Float32Array
      const float32Data = new Float32Array(image.length);
      for (let i = 0; i < image.length; i++) {
        float32Data[i] = image[i] / 255.0; // Normalize to [0, 1]
      }

      // Create tensor from Float32Array
      const tensor = tf.tensor4d(float32Data, [1, 224, 224, 3]);

      return {
        buffer: image,
        tensor
      };
    } catch (error) {
      console.error('Error preprocessing image:', error);
      throw new AppError('Failed to preprocess image', 500);
    }
  }

  private async runTensorflowAnalysis(tensor: tf.Tensor4D, scanType: ScanType): Promise<tf.Tensor | undefined> {
    try {
      const model = this.models.get(scanType);
      if (!model) {
        throw new AppError(`No model available for scan type: ${scanType}`, 400);
      }

      const predictions = await model.predict(tensor) as tf.Tensor;
      tensor.dispose();

      return predictions;
    } catch (error) {
      console.error('Error running TensorFlow analysis:', error);
      return undefined;
    }
  }

  private async analyzeWithAI(buffer: Buffer, scanType: ScanType, tfPredictions?: tf.Tensor): Promise<Finding[]> {
    try {
      const base64Image = buffer.toString('base64');
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a medical image analysis assistant. Analyze the following ${scanType} scan and provide detailed findings.`
        } as const,
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this ${scanType} scan. ${tfPredictions ? `TensorFlow model predictions: ${tfPredictions.toString()}` : ''}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ] as ChatCompletionContentPart[]
        } as const
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages,
        max_tokens: 1000
      });

      if (tfPredictions) {
        tfPredictions.dispose();
      }

      return this.parseAIResponse(response.choices[0]?.message?.content || '');
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      throw new AppError('Failed to analyze image with AI', 500);
    }
  }

  private parseAIResponse(content: string): Finding[] {
    try {
      const findings: Finding[] = [];
      const sections = content.split('\n\n');

      for (const section of sections) {
        if (section.trim()) {
          const finding: Finding = {
            type: 'anomaly',
            location: {
              x: 0,
              y: 0,
              width: 0,
              height: 0
            },
            confidence: 0.8,
            description: section.trim(),
            severity: 'medium'
          };

          // Extract location if specified
          const locationMatch = section.match(/Location: \{([^}]+)\}/);
          if (locationMatch) {
            try {
              finding.location = JSON.parse(`{${locationMatch[1]}}`);
            } catch (e) {
              console.warn('Failed to parse location data:', e);
            }
          }

          // Extract confidence if specified
          const confidenceMatch = section.match(/Confidence: ([\d.]+)/);
          if (confidenceMatch) {
            finding.confidence = parseFloat(confidenceMatch[1]);
          }

          // Extract severity if specified
          const severityMatch = section.match(/Severity: (low|medium|high)/i);
          if (severityMatch) {
            finding.severity = severityMatch[1].toLowerCase() as 'low' | 'medium' | 'high';
          }

          findings.push(finding);
        }
      }

      return findings;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  private calculateOverallConfidence(findings: Finding[]): number {
    if (findings.length === 0) return 0;
    return findings.reduce((sum, finding) => sum + finding.confidence, 0) / findings.length;
  }
} 