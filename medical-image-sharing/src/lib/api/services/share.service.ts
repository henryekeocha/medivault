import { patientClient } from '../patientClient';
import { providerClient } from '../providerClient';
import type { ApiResponse, Share, PaginatedResponse, Image } from '../types';
import { ShareType, SharePermission } from '@prisma/client';

export class ShareService {
  private patientClient;
  private providerClient;
  private userRole: 'PATIENT' | 'PROVIDER' | null = null;

  constructor() {
    this.patientClient = patientClient;
    this.providerClient = providerClient;
  }

  setUserRole(role: 'PATIENT' | 'PROVIDER') {
    this.userRole = role;
  }

  private getClient() {
    if (!this.userRole) {
      throw new Error('User role not set. Call setUserRole first.');
    }
    return this.userRole === 'PATIENT' ? this.patientClient : this.providerClient;
  }

  async createShare(data: {
    imageId: string;
    recipientId: string;
    expiryDays?: number;
    allowDownload?: boolean;
  }): Promise<ApiResponse<void>> {
    if (this.userRole === 'PATIENT') {
      return this.patientClient.shareImage({
        providerId: data.recipientId,
        imageId: data.imageId,
        expiryDays: data.expiryDays || 30,
        allowDownload: data.allowDownload || true
      });
    } else {
      return this.providerClient.shareImage(data.imageId, data.recipientId);
    }
  }

  async getShares(params?: {
    imageId?: string;
    userId?: string;
    type?: ShareType;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Image[]>> {
    if (this.userRole === 'PATIENT') {
      return this.patientClient.getSharedImages();
    } else {
      return this.providerClient.getImages({ 
        ...params,
        patientId: params?.userId 
      });
    }
  }

  async updateShare(id: string, data: Partial<Share>): Promise<ApiResponse<Share>> {
    throw new Error('Update share operation not supported in new API structure');
  }

  async deleteShare(shareId: string): Promise<ApiResponse<void>> {
    return this.getClient().revokeImageAccess(shareId, shareId);
  }

  getShareUrl(share: Share): string {
    if (share.type === ShareType.LINK && share.shareUrl) {
      return `${window.location.origin}/share/${share.shareUrl}`;
    }
    return '';
  }

  isExpired(share: Share): boolean {
    if (!share.expiresAt) return false;
    return new Date(share.expiresAt) < new Date();
  }

  isActive(share: Share): boolean {
    return !this.isExpired(share) && share.emailSent;
  }

  canEdit(share: Share): boolean {
    return share.permissions === SharePermission.EDIT || share.permissions === SharePermission.FULL;
  }

  canShare(share: Share): boolean {
    return share.permissions === SharePermission.FULL;
  }
}

export const shareService = new ShareService(); 