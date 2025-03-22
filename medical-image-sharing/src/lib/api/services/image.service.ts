import { ApiClient } from '../client';
import type { ApiResponse, Image, PaginatedResponse, DicomMetadata } from '../types';

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

// Use the local type definition
type AxiosProgressEvent = {
  loaded: number;
  total?: number;
  progress?: number;
  bytes: number;
  estimated?: number;
  rate?: number;
  upload?: boolean;
};

// DICOM is the only supported content type
const DICOM_CONTENT_TYPE = 'application/dicom';
const DICOM_EXTENSION = '.dcm';

// Extended Image type with our custom properties
interface DicomImage extends Image {
  fileExtension?: string;
}

export class ImageService {
  private static instance: ImageService;
  private client: ApiClient;

  private constructor() {
    this.client = ApiClient.getInstance();
  }

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  /**
   * Upload a DICOM image file
   * @param file DICOM file to upload
   * @param metadata Additional metadata for the image
   * @param onProgress Progress callback for upload
   * @returns Uploaded image information
   */
  async uploadImage(
    file: File,
    metadata: Partial<Image>,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<ApiResponse<Image>> {
    // Ensure we're uploading a DICOM file
    let fileToUpload = file;
    if (!file.name.toLowerCase().endsWith(DICOM_EXTENSION) && file.type !== DICOM_CONTENT_TYPE) {
      // If not a .dcm file, we rename it and set the DICOM content type
      const renamedFile = new File([file], `${file.name}${DICOM_EXTENSION}`, { 
        type: DICOM_CONTENT_TYPE
      });
      fileToUpload = renamedFile;
    }
    
    // Set DICOM-specific metadata
    const dicomMetadata: Partial<Image> = {
      ...metadata,
      fileType: DICOM_CONTENT_TYPE,
      // Parse existing metadata if it's a string, or use empty object if null
      metadata: JSON.stringify({
        ...(metadata.metadata ? JSON.parse(metadata.metadata) : {}),
        isDicom: true,
        dicomVersion: '3.0',
        fileExtension: DICOM_EXTENSION
      })
    };
    
    return this.client.uploadImage(fileToUpload, dicomMetadata, onProgress);
  }
  
  // Maintaining this method for backward compatibility and explicit DICOM handling
  async uploadDicomImage(
    file: File,
    metadata: Partial<Image>,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<ApiResponse<Image>> {
    return this.uploadImage(file, metadata, onProgress);
  }

  async getImages(params?: {
    page?: number;
    limit?: number;
    type?: ImageType;
    status?: ImageStatus;
    patientId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Image>>> {
    return this.client.getImages(params);
  }

  /**
   * Get DICOM images with specialized filtering (alias for getImages)
   * @param params Filter parameters
   * @returns Paginated list of DICOM images
   */
  async getDicomImages(params?: {
    page?: number;
    limit?: number;
    status?: ImageStatus;
    patientId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Image>>> {
    // All images are DICOM, so this is now equivalent to getImages
    return this.getImages(params);
  }

  async getImage(id: string): Promise<ApiResponse<Image>> {
    return this.client.getImage(id);
  }

  async deleteImage(id: string): Promise<ApiResponse<void>> {
    return this.client.deleteImage(id);
  }

  async downloadImage(id: string): Promise<Blob> {
    return this.client.downloadImage(id);
  }

  /**
   * Extract DICOM metadata from an image
   * @param id Image ID
   * @returns DICOM metadata
   */
  async getDicomMetadata(id: string): Promise<ApiResponse<DicomMetadata>> {
    try {
      const response = await this.client.get<DicomMetadata>(`/api/images/${id}/dicom-metadata`);
      return {
        status: 'success',
        data: response,
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
    return image.fileType === DICOM_CONTENT_TYPE && 
      (Boolean(dicomImage.fileExtension === DICOM_EXTENSION) || 
       Boolean(image.metadata && (image.metadata as any).fileExtension === DICOM_EXTENSION));
  }
} 