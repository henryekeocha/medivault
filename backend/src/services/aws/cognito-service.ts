import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
  UpdateUserAttributesCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ResendConfirmationCodeCommand,
  GlobalSignOutCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Service for interacting with AWS Cognito
 */
export class CognitoService {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  constructor() {
    // Initialize the Cognito client
    this.client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // Set the User Pool ID and Client ID from environment variables
    this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
    this.clientId = process.env.COGNITO_CLIENT_ID || '';

    if (!this.userPoolId || !this.clientId) {
      console.warn('Cognito User Pool ID or Client ID not set in environment variables');
    }
  }

  /**
   * Sign up a new user with Cognito
   * @param email User's email
   * @param password User's password
   * @param attributes Additional user attributes
   * @returns Result from Cognito
   */
  async signUp(
    email: string,
    password: string,
    attributes: Record<string, string> = {}
  ) {
    try {
      // Map attributes to the format expected by Cognito
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      }));

      // Always include email as an attribute
      userAttributes.push({
        Name: 'email',
        Value: email,
      });

      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: userAttributes,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito sign up error:', error);
      throw error;
    }
  }

  /**
   * Confirm a user's sign up with verification code
   * @param email User's email
   * @param code Verification code
   * @returns Result from Cognito
   */
  async confirmSignUp(email: string, code: string) {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito confirm sign up error:', error);
      throw error;
    }
  }

  /**
   * Resend the confirmation code for sign up
   * @param email User's email
   * @returns Result from Cognito
   */
  async resendConfirmationCode(email: string) {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito resend code error:', error);
      throw error;
    }
  }

  /**
   * Authenticate a user with Cognito
   * @param email User's email
   * @param password User's password
   * @returns Authentication result
   */
  async signIn(email: string, password: string) {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign out a user from all devices
   * @param accessToken User's access token
   * @returns Result from Cognito
   */
  async signOut(accessToken: string) {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito sign out error:', error);
      throw error;
    }
  }

  /**
   * Initiate a forgot password flow
   * @param email User's email
   * @returns Result from Cognito
   */
  async forgotPassword(email: string) {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito forgot password error:', error);
      throw error;
    }
  }

  /**
   * Confirm a new password with verification code
   * @param email User's email
   * @param code Verification code
   * @param newPassword New password
   * @returns Result from Cognito
   */
  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito confirm forgot password error:', error);
      throw error;
    }
  }

  /**
   * Get user details with access token
   * @param accessToken User's access token
   * @returns User details
   */
  async getUser(accessToken: string) {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito get user error:', error);
      throw error;
    }
  }

  /**
   * Get user details as admin
   * @param username User's username (email)
   * @returns User details
   */
  async adminGetUser(username: string) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito admin get user error:', error);
      throw error;
    }
  }

  /**
   * Update user attributes
   * @param accessToken User's access token
   * @param attributes Attributes to update
   * @returns Result from Cognito
   */
  async updateUserAttributes(
    accessToken: string,
    attributes: Record<string, string>
  ) {
    try {
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      }));

      const command = new UpdateUserAttributesCommand({
        AccessToken: accessToken,
        UserAttributes: userAttributes,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito update user attributes error:', error);
      throw error;
    }
  }

  /**
   * Admin create a new user
   * @param email User's email
   * @param temporaryPassword Temporary password
   * @param attributes Additional user attributes
   * @returns Result from Cognito
   */
  async adminCreateUser(
    email: string,
    temporaryPassword: string,
    attributes: Record<string, string> = {}
  ) {
    try {
      // Map attributes to the format expected by Cognito
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      }));

      // Always include email as an attribute
      userAttributes.push({
        Name: 'email',
        Value: email,
      });

      const command = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        TemporaryPassword: temporaryPassword,
        UserAttributes: userAttributes,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito admin create user error:', error);
      throw error;
    }
  }

  /**
   * Admin set user password (no reset required)
   * @param email User's email
   * @param password New password
   * @param permanent Whether the password is permanent (not temporary)
   * @returns Result from Cognito
   */
  async adminSetUserPassword(
    email: string,
    password: string,
    permanent: boolean = true
  ) {
    try {
      const command = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: password,
        Permanent: permanent,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito admin set user password error:', error);
      throw error;
    }
  }

  /**
   * Admin update user attributes
   * @param email User's email
   * @param attributes Attributes to update
   * @returns Result from Cognito
   */
  async adminUpdateUserAttributes(
    email: string,
    attributes: Record<string, string>
  ) {
    try {
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      }));

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: userAttributes,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito admin update user attributes error:', error);
      throw error;
    }
  }

  /**
   * Admin disable a user
   * @param email User's email
   * @returns Result from Cognito
   */
  async adminDisableUser(email: string) {
    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito admin disable user error:', error);
      throw error;
    }
  }

  /**
   * Admin enable a user
   * @param email User's email
   * @returns Result from Cognito
   */
  async adminEnableUser(email: string) {
    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito admin enable user error:', error);
      throw error;
    }
  }

  /**
   * Admin add user to group
   * @param email User's email
   * @param groupName Group name
   * @returns Result from Cognito
   */
  async adminAddUserToGroup(email: string, groupName: string) {
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        GroupName: groupName,
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('Cognito admin add user to group error:', error);
      throw error;
    }
  }

  /**
   * Refresh the session tokens using a refresh token
   * @param refreshToken The refresh token to use
   * @returns New access, ID, and refresh tokens
   */
  async refreshSession(refreshToken: string) {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken
        }
      });

      const response = await this.client.send(command);
      const authResult = response.AuthenticationResult;

      if (!authResult) {
        throw new Error('Failed to refresh session');
      }

      return {
        accessToken: authResult.AccessToken,
        idToken: authResult.IdToken,
        refreshToken: authResult.RefreshToken || refreshToken, // Use existing refresh token if no new one is provided
        expiresIn: authResult.ExpiresIn,
        tokenType: authResult.TokenType
      };
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const cognitoService = new CognitoService(); 