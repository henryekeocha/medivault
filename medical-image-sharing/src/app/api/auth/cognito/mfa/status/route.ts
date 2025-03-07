'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';
import { getCognitoConfig } from '@/lib/aws/cognito-config';
import { 
  CognitoIdentityProviderClient, 
  AdminGetUserCommand,
  GetUserPoolMfaConfigCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoJwtVerifier } from '@/lib/auth/cognito-jwt-verifier';

/**
 * GET handler to retrieve MFA status for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('cognitoIdToken');
    
    if (!tokenCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authentication token provided' },
        { status: 401 }
      );
    }
    
    const token = tokenCookie.value;
    const tokenPayload = cognitoJwtVerifier.decodeToken(token);
    const username = tokenPayload.sub;
    
    if (!username) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const config = getCognitoConfig();
    const client = new CognitoIdentityProviderClient({
      region: config.region
    });
    
    // Get user attributes using AdminGetUser
    const adminGetUserCommand = new AdminGetUserCommand({
      UserPoolId: config.userPoolId,
      Username: username
    });
    
    const userResult = await client.send(adminGetUserCommand);
    
    // Get available MFA options in the user pool
    const poolMfaCommand = new GetUserPoolMfaConfigCommand({
      UserPoolId: config.userPoolId
    });
    
    const poolMfaResult = await client.send(poolMfaCommand);
    
    // Find the preferred MFA setting
    let preferredMFA = 'NONE';
    let isMFAEnabled = false;
    
    // Check user attributes for preferred MFA setting
    const preferredMFAAttr = userResult.UserAttributes?.find(
      attr => attr.Name === 'custom:preferred_mfa'
    );
    
    if (preferredMFAAttr?.Value) {
      preferredMFA = preferredMFAAttr.Value;
      isMFAEnabled = preferredMFA !== 'NONE';
    }
    
    // Available MFA methods
    const availableMFA: string[] = [];
    
    // Check if SMS MFA is configured
    if (poolMfaResult.SmsMfaConfiguration && 
        poolMfaResult.SmsMfaConfiguration.SmsConfiguration) {
      availableMFA.push('SMS_MFA');
    }
    
    // Check if TOTP MFA is enabled
    if (poolMfaResult.SoftwareTokenMfaConfiguration && 
        poolMfaResult.SoftwareTokenMfaConfiguration.Enabled) {
      availableMFA.push('SOFTWARE_TOKEN_MFA');
    }
    
    // Log audit event
    logAudit('MFA_STATUS_CHECKED' as any, {
      userId: username,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      isMFAEnabled,
      preferredMFA,
      availableMFA
    });
  } catch (error) {
    console.error('Error getting MFA status:', error);
    const apiError = handleApiError(error);
    
    logAudit('MFA_STATUS_CHECK_FAILED' as any, {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: apiError.message
    });
    
    return NextResponse.json(
      { error: apiError.code, message: apiError.message },
      { status: apiError.statusCode }
    );
  }
} 