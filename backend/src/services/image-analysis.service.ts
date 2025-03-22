import { AppError } from '../utils/appError.js';
import { OpenAI } from 'openai';
import sharp from 'sharp';
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { prisma } from '../lib/prisma.js';
import type { Image, AuditLog } from '@prisma/client';
import fetch from 'node-fetch';
import crypto from 'crypto';

interface AnalysisResult {
  findings: Finding[];
  confidence: number;
  processingTime: number;
  modelVersion: string;
  bioVilPredictions?: {
    label: string;
    probability: number;
  }[];
  temporalChanges?: string;
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

interface BioVilResponse {
  embedding?: number[];
  labels?: string[];
  scores?: number[];
  text_output?: string;
  error?: string;
}

const SUPPORTED_SCAN_TYPES = ['xray', 'mri', 'ct', 'ultrasound'] as const;
type ScanType = typeof SUPPORTED_SCAN_TYPES[number];

// Cache for API responses to reduce duplicate calls
const responseCache = new Map<string, any>();

export class ImageAnalysisService {
  private openai: OpenAI;
  private modelVersion: string = 'v1.2-biomedvlp-biovil-t';
  private readonly HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/microsoft/BiomedVLP-BioViL-T';
  private readonly HUGGINGFACE_API_KEY: string;
  
  // Max number of retry attempts for API calls
  private readonly MAX_RETRIES = 3;
  // Initial backoff time in milliseconds
  private readonly INITIAL_BACKOFF = 1000;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Get the Hugging Face API key from environment variables
    this.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
    
    if (!this.HUGGINGFACE_API_KEY) {
      console.warn('HUGGINGFACE_API_KEY is not set. BiomedVLP-BioViL-T model will not work properly.');
    }
  }

  /**
   * Analyze a single medical image
   */
  public async analyzeImage(imageId: string, userId: string, previousImageId?: string): Promise<AnalysisResult> {
    try {
      const startTime = Date.now();

      // Get image from database using Prisma
      const image = await prisma.image.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new AppError('Image not found', 404);
      }

      // Get previous image if provided for temporal comparison
      let previousImage = null;
      if (previousImageId) {
        previousImage = await prisma.image.findUnique({
          where: { id: previousImageId }
        });
      }

      // Get image data from S3 URL
      const imageBuffer = await fetch(image.s3Url).then(res => res.arrayBuffer());
      
      // Get previous image buffer if available
      let previousImageBuffer = null;
      if (previousImage) {
        previousImageBuffer = await fetch(previousImage.s3Url).then(res => res.arrayBuffer());
      }

      // Preprocess image
      const { buffer } = await this.preprocessImage(Buffer.from(imageBuffer));
      
      // Preprocess previous image if available
      let prevBuffer = null;
      if (previousImageBuffer) {
        const prevProcessed = await this.preprocessImage(Buffer.from(previousImageBuffer));
        prevBuffer = prevProcessed.buffer;
      }

      // Get scan type from metadata
      const scanType = (image.metadata as any)?.scanType as ScanType;
      if (!scanType || !SUPPORTED_SCAN_TYPES.includes(scanType)) {
        throw new AppError('Invalid or missing scan type', 400);
      }

      // Run BiomedVLP-BioViL-T analysis
      const bioVilPredictions = await this.runBioVilAnalysis(buffer, scanType);

      // For chest X-rays, perform temporal analysis if previous image is available
      let temporalChanges = undefined;
      if (scanType === 'xray' && prevBuffer) {
        temporalChanges = await this.performTemporalAnalysis(buffer, prevBuffer);
      }

      // Run AI analysis with OpenAI
      const findings = await this.analyzeWithAI(buffer, scanType, bioVilPredictions, temporalChanges);

      // Calculate confidence
      const confidence = this.calculateOverallConfidence(findings);

      // Create analysis result
      const result: AnalysisResult = {
        findings,
        confidence,
        processingTime: Date.now() - startTime,
        modelVersion: this.modelVersion,
        bioVilPredictions: bioVilPredictions ? bioVilPredictions.map((pred) => ({
          label: pred.label,
          probability: pred.score
        })) : undefined,
        temporalChanges
      };

      // Log the analysis using Prisma
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'IMAGE_ANALYSIS',
          details: {
            confidence,
            findingsCount: findings.length,
            processingTime: result.processingTime,
            hasTemporalAnalysis: !!temporalChanges
          }
        }
      });

      return result;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new AppError('Failed to analyze image', 500);
    }
  }

  /**
   * Analyze a batch of medical images
   */
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
          modelVersion: this.modelVersion,
          error: error instanceof AppError ? error.message : 'Unknown error occurred'
        });
      }
    }));

    return results;
  }

  /**
   * Preprocess images for the BiomedVLP-BioViL-T model
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<{ buffer: Buffer }> {
    try {
      // BioViL-T expects images of size 224x224
      const image = await sharp(imageBuffer)
        .resize(224, 224)
        .toFormat('jpeg') // Explicitly convert to JPEG for consistency
        .jpeg({ quality: 90 }) // Optimal quality for medical imaging
        .normalize() // Normalize pixel values
        .toBuffer();

      return {
        buffer: image
      };
    } catch (error) {
      console.error('Error preprocessing image:', error);
      throw new AppError('Failed to preprocess image', 500);
    }
  }

  /**
   * Call the BiomedVLP-BioViL-T model via Hugging Face API with retry logic
   */
  private async callHuggingFaceAPI(payload: any, retryCount = 0): Promise<BioVilResponse> {
    try {
      // Generate cache key based on the payload
      const cacheKey = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
      
      // Check cache first to avoid redundant API calls
      if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey);
      }
      
      if (!this.HUGGINGFACE_API_KEY) {
        throw new AppError('HUGGINGFACE_API_KEY is not set', 500);
      }

      const response = await fetch(this.HUGGINGFACE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429 && retryCount < this.MAX_RETRIES) {
        const backoff = this.INITIAL_BACKOFF * Math.pow(2, retryCount);
        console.warn(`Rate limit reached. Retrying in ${backoff}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.callHuggingFaceAPI(payload, retryCount + 1);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(`Failed BiomedVLP-BioViL-T API call: ${errorText}`, response.status);
      }

      const result = await response.json();
      
      // Get model version info if available in headers
      const modelInfo = response.headers.get('x-model-id') || 'BiomedVLP-BioViL-T';
      this.modelVersion = `v1.2-${modelInfo.split('/').pop()}`;
      
      // Cache the response
      responseCache.set(cacheKey, result);
      
      // If cache gets too large, clear oldest entries
      if (responseCache.size > 100) {
        const oldestKey = responseCache.keys().next().value;
        if (oldestKey !== undefined) {
          responseCache.delete(oldestKey);
        }
      }
      
      return result;
    } catch (error) {
      if (retryCount < this.MAX_RETRIES && payload && typeof payload === 'object') {
        const backoff = this.INITIAL_BACKOFF * Math.pow(2, retryCount);
        console.warn(`API call failed. Retrying in ${backoff}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        // Ensure payload is valid before retrying
        return this.callHuggingFaceAPI(payload, retryCount + 1);
      }
      
      console.error('Error calling Hugging Face API:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Run BiomedVLP-BioViL-T model for image classification
   */
  private async runBioVilAnalysis(buffer: Buffer, scanType: ScanType): Promise<{ label: string; score: number }[]> {
    try {
      // Convert image to base64
      const base64Image = buffer.toString('base64');
      
      // Prepare appropriate candidate labels based on scan type
      const candidateLabels = this.getCandidateLabelsForScanType(scanType);
      
      // Prepare payload for Hugging Face API (zero-shot classification)
      const payload = {
        inputs: {
          image: base64Image
        },
        parameters: {
          candidate_labels: candidateLabels
        }
      };

      // Call the API with payload
      const result = await this.callHuggingFaceAPI(payload);
      
      if (result.error) {
        console.error('BioViL-T analysis error:', result.error);
        return [];
      }

      // Format the results
      if (result.labels && result.scores) {
        const predictions = result.labels.map((label, index) => ({
          label,
          score: result.scores![index]
        }));
        return predictions;
      }
      
      return [];
    } catch (error) {
      console.error('Error running BiomedVLP-BioViL-T analysis:', error);
      // Return empty predictions instead of throwing, so the AI analysis can still proceed
      return [];
    }
  }

  /**
   * Perform temporal analysis on chest X-rays
   */
  private async performTemporalAnalysis(currentImage: Buffer, previousImage: Buffer): Promise<string | undefined> {
    try {
      // Convert images to base64
      const currentBase64 = currentImage.toString('base64');
      const previousBase64 = previousImage.toString('base64');
      
      // Prepare payload for temporal analysis
      const temporalPrompt = "Describe the temporal changes between these sequential chest X-rays.";
      
      const payload = {
        inputs: {
          image: [previousBase64, currentBase64],
          text: temporalPrompt
        }
      };
      
      // Call the API for temporal analysis
      const result = await this.callHuggingFaceAPI(payload);
      
      if (result.error) {
        console.error('Temporal analysis error:', result.error);
        return undefined;
      }
      
      // Return the generated text description of temporal changes
      return typeof result.text_output === 'string' ? result.text_output : undefined;
    } catch (error) {
      console.error('Error in temporal analysis:', error);
      return undefined;
    }
  }

  /**
   * Analyze image with OpenAI's GPT-4 Vision
   */
  private async analyzeWithAI(
    buffer: Buffer, 
    scanType: ScanType, 
    bioVilPredictions?: { label: string; score: number }[],
    temporalChanges?: string
  ): Promise<Finding[]> {
    try {
      const base64Image = buffer.toString('base64');
      
      // Create a more informative system prompt based on scan type
      const systemPrompt = this.createSystemPrompt(scanType);
      
      // Create a custom user prompt with BioViL-T analysis and temporal changes
      const userPrompt = this.createUserPrompt(scanType, bioVilPredictions, temporalChanges);
      
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt
        } as const,
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
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

      return this.parseAIResponse(response.choices[0]?.message?.content || '');
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      throw new AppError('Failed to analyze image with AI', 500);
    }
  }

  /**
   * Create a system prompt for OpenAI based on scan type
   */
  private createSystemPrompt(scanType: ScanType): string {
    let prompt = `You are a medical image analysis assistant specializing in ${scanType} analysis.`;
    
    if (scanType === 'xray') {
      prompt += " Provide a detailed analysis of chest X-rays, focusing on cardiac and pulmonary findings. Report on any abnormalities in heart size, lung fields, pleural spaces, diaphragm, and bony structures. Be specific about locations using anatomical terms.";
    } else if (scanType === 'mri') {
      prompt += " Provide a detailed analysis of MRI scans, focusing on soft tissue contrast. Report on any abnormal signal intensities, masses, structural abnormalities, and fluid collections. Use proper radiological descriptors for findings.";
    } else if (scanType === 'ct') {
      prompt += " Provide a detailed analysis of CT scans, focusing on tissue densities. Report on any abnormal densities, masses, structural abnormalities, calcifications, and fluid collections. Use proper Hounsfield unit references when relevant.";
    } else if (scanType === 'ultrasound') {
      prompt += " Provide a detailed analysis of ultrasound images, focusing on echogenicity patterns. Report on any abnormal structures, fluid collections, masses, and vascular findings. Use proper sonographic terminology.";
    }
    
    prompt += " For each finding, provide: (1) A clear description, (2) Location using anatomical terms, (3) Potential clinical significance, (4) Confidence level (low/medium/high), and (5) Severity (low/medium/high).";
    
    return prompt;
  }

  /**
   * Create a user prompt with BioViL-T analysis information
   */
  private createUserPrompt(
    scanType: ScanType, 
    bioVilPredictions?: { label: string; score: number }[],
    temporalChanges?: string
  ): string {
    let prompt = `Please analyze this ${scanType} scan.\n\n`;
    
    // Add BioViL-T predictions if available
    if (bioVilPredictions && bioVilPredictions.length > 0) {
      prompt += "BiomedVLP-BioViL-T model predictions:\n";
      bioVilPredictions.forEach(p => {
        prompt += `- ${p.label}: ${(p.score * 100).toFixed(2)}%\n`;
      });
      prompt += "\n";
    } else {
      prompt += "No BiomedVLP-BioViL-T predictions available.\n\n";
    }
    
    // Add temporal analysis if available
    if (temporalChanges && typeof temporalChanges === 'string') {
      prompt += "Temporal analysis from previous scan:\n";
      prompt += temporalChanges + "\n\n";
    }
    
    prompt += "Please structure your analysis as separate findings, with each finding including description, location, confidence, and severity.";
    
    return prompt;
  }

  /**
   * Get appropriate candidate labels for different scan types
   */
  private getCandidateLabelsForScanType(scanType: ScanType): string[] {
    if (scanType === 'xray') {
      return [
        "normal", "abnormal", "pneumonia", "effusion", "cardiomegaly", 
        "mass", "nodule", "atelectasis", "pneumothorax", "consolidation",
        "edema", "emphysema", "fibrosis", "pleural thickening", "hernia"
      ];
    } else if (scanType === 'mri') {
      return [
        "normal", "abnormal", "tumor", "lesion", "inflammation",
        "infarction", "hemorrhage", "edema", "cyst", "requires attention"
      ];
    } else if (scanType === 'ct') {
      return [
        "normal", "abnormal", "tumor", "mass", "fracture", 
        "hemorrhage", "calcification", "infection", "inflammation", "emphysema"
      ];
    } else { // ultrasound
      return [
        "normal", "abnormal", "mass", "cyst", "calcification",
        "inflammation", "fluid collection", "requires attention"
      ];
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