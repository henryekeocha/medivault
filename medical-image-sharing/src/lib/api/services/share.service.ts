import { ApiClient } from '../client';
import type { ApiResponse, Share, PaginatedResponse } from '../types';
import { ShareType, SharePermission } from '@prisma/client';

export class ShareService {
  private static instance: ShareService;
  private client: ApiClient;

  private constructor() {
    this.client = ApiClient.getInstance();
  }

  public static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  async createShare(data: Partial<Share>): Promise<ApiResponse<Share>> {
    return this.client.createShare(data);
  }

  async getShares(params?: {
    imageId?: string;
    userId?: string;
    type?: ShareType;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Share>>> {
    return this.client.getShares(params);
  }

  async updateShare(id: string, data: Partial<Share>): Promise<ApiResponse<Share>> {
    return this.client.updateShare(id, data);
  }

  async deleteShare(id: string): Promise<ApiResponse<void>> {
    return this.client.deleteShare(id);
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