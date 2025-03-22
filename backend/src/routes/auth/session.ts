import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../lib/prisma.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Define JWT payload interface
interface JwtPayload {
  sub: string | (() => string);
  email?: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Refresh the session tokens
 * POST /auth/session/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify the refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as JwtPayload;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Get user from database - ensure we have a string ID
    const userId = typeof payload.sub === 'function' ? payload.sub() : payload.sub;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate new tokens
    const newAccessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    
    const newRefreshToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error('Error refreshing session:', error);
    return res.status(401).json({
      success: false,
      message: 'Failed to refresh session. Please log in again.'
    });
  }
});

// Protected routes
router.use(protect);

/**
 * Get current session information
 * GET /auth/session
 */
router.get('/', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify the token
    let payload;
    try {
      payload = jwt.verify(accessToken, process.env.JWT_SECRET as string) as JwtPayload;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        session: { isValid: false }
      });
    }
    
    // Get user from database - ensure we have a string ID
    const userId = typeof payload.sub === 'function' ? payload.sub() : payload.sub;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        session: { isValid: false }
      });
    }
    
    return res.status(200).json({
      success: true,
      session: {
        isValid: true,
        username: user.name,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Error getting session information:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session',
      session: {
        isValid: false
      }
    });
  }
});

/**
 * Invalidate the current session (sign out)
 * POST /auth/session/revoke
 */
router.post('/revoke', async (req, res) => {
  try {
    // With JWT tokens, we don't need to invalidate them on the server
    // The client should remove the tokens from storage
    
    return res.status(200).json({
      success: true,
      message: 'Session invalidated successfully'
    });
  } catch (error) {
    logger.error('Error revoking session:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while signing out'
    });
  }
});

export default router; 