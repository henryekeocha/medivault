import { ApiClient } from '../client';
import type { LoginRequest, RegisterRequest, AuthResponse, ApiResponse, User, TokenValidationResponse } from '../types';

export class AuthService {
  private static instance: AuthService;
  private client: ApiClient;

  private constructor() {
    this.client = ApiClient.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> { 
    return this.client.login(data);
  }

  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.client.register(data);
  }

  async logout(): Promise<void> {
    return this.client.logout();
  }

  async validateToken(): Promise<ApiResponse<TokenValidationResponse>> {
    return this.client.validateToken();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.client.getCurrentUser();
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
} 