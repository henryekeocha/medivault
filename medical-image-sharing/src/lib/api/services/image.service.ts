import { patientClient } from '../patientClient';
import { providerClient } from '../providerClient';
import { adminClient } from '../adminClient';
import { ApiResponse, Image, PaginatedResponse, DicomMetadata, SharedImage } from '../types';

// Using local enums because of import issues with prisma
enum ImageStatus {
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR'
}

enum ImageType {
  XRAY = 'XRAY',
  MRI = 'MRI',
  CT = 'CT',
  ULTRASOUND = 'ULTRASOUND',
  OTHER = 'OTHER'
}

// Extended Image type with our custom properties
interface DicomImage extends Image {
  fileExtension?: string;
}

export class ImageService {
  private patientClient;
  private providerClient;
  private adminClient;
  private userRole: 'PATIENT' | 'PROVIDER' | 'ADMIN' | null = null;

  constructor() {
    this.patientClient = patientClient;
    this.providerClient = providerClient;
    this.adminClient = adminClient;
  }

  setUserRole(role: 'PATIENT' | 'PROVIDER' | 'ADMIN') {
    this.userRole = role;
  }

  private getClient() {
    if (!this.userRole) {
      throw new Error('User role not set. Call setUserRole first.');
    }
    switch (this.userRole) {
      case 'PATIENT':
        return this.patientClient;
      case 'PROVIDER':
        return this.providerClient;
      case 'ADMIN':
        return this.adminClient;
      default:
        throw new Error(`Invalid user role: ${this.userRole}`);
    }
  }

  /**
   * Upload a DICOM image file
   * @param file DICOM file to upload
   * @param metadata Additional metadata for the image
   * @param onProgress Progress callback for upload
   * @returns Uploaded image information
   */
  async uploadImage(file: File, metadata?: Record<string, any>, onProgress?: (progress: number) => void): Promise<ApiResponse<Image>> {
    return this.getClient().uploadImage(file, metadata, onProgress);
  }

  async getImages(params?: { 
    page?: number; 
    limit?: number;
    patientId?: string;
  }): Promise<ApiResponse<PaginatedResponse<Image> | Image[]>> {
    try {
      return await this.getClient().getImages(params);
    } catch (error) {
      console.error('Error fetching images in image service:', error);
      // Return a default empty response instead of throwing the error
      return {
        status: 'success',
        data: {
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: 0,
            pages: 0
          }
        } as PaginatedResponse<Image>
      };
    }
  }

  async getImage(imageId: string): Promise<ApiResponse<Image>> {
    return this.getClient().getImage(imageId);
  }

  async deleteImage(imageId: string): Promise<ApiResponse<void>> {
    return this.getClient().deleteImage(imageId);
  }

  async updateImage(imageId: string, data: Partial<Image>): Promise<ApiResponse<Image>> {
    return this.getClient().updateImage(imageId, data);
  }

  async shareImage(imageId: string, recipientId: string, options?: {
    expiryDays?: number;
    allowDownload?: boolean;
  }): Promise<ApiResponse<void | SharedImage>> {
    if (this.userRole === 'PATIENT') {
      return this.patientClient.shareImage({
        providerId: recipientId,
        imageId,
        expiryDays: options?.expiryDays || 30,
        allowDownload: options?.allowDownload || true
      });
    } else {
      return this.providerClient.shareImage(imageId, recipientId);
    }
  }

  async revokeImageAccess(imageId: string, userId: string): Promise<ApiResponse<void>> {
    return this.getClient().revokeImageAccess(imageId, userId);
  }

  async downloadImage(imageId: string): Promise<Blob> {
    return this.getClient().downloadImage(imageId);
  }

  /**
   * Extract DICOM metadata from an image
   * @param id Image ID
   * @returns DICOM metadata
   */
  async getDicomMetadata(id: string): Promise<ApiResponse<DicomMetadata>> {
    try {
      const response = await this.getClient().getDicomMetadata(id);
      return {
        status: 'success',
        data: response.data,
        error: undefined
      };
    } catch (error) {
      console.error('Error getting DICOM metadata:', error);
      return {
        status: 'error',
        data: {} as DicomMetadata,
        error: {
          message: 'Failed to retrieve DICOM metadata',
          code: 'DICOM_METADATA_ERROR'
        }
      };
    }
  }

  getImageUrl(image: Image): string {
    return image.s3Url || `/api/images/${image.id}/view`;
  }

  getThumbnailUrl(image: Image): string {
    return `/api/images/${image.id}/thumbnail`;
  }

  /**
   * Get DICOM viewer URL
   * @param image Image object
   * @returns URL for DICOM viewer
   */
  getDicomViewerUrl(image: Image): string {
    return `/api/images/${image.id}/dicom-view`;
  }

  isProcessing(image: Image): boolean {
    return image.status === ImageStatus.PROCESSING;
  }

  hasError(image: Image): boolean {
    return image.status === ImageStatus.ERROR;
  }

  isReady(image: Image): boolean {
    return image.status === ImageStatus.READY;
  }

  /**
   * Check if an image is a valid DICOM file
   * All images should be DICOM files, but this validates the metadata is correct
   * @param image Image to check
   * @returns True if the image has proper DICOM metadata
   */
  isDicom(image: Image): boolean {
    // All images are DICOM, but check for proper metadata
    const dicomImage = image as DicomImage;
    return image.fileType === 'application/dicom' && 
      (Boolean(dicomImage.fileExtension === '.dcm') || 
       Boolean(image.metadata && (image.metadata as any).fileExtension === '.dcm'));
  }
}

export const imageService = new ImageService(); 