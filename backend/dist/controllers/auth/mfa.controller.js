import { asyncHandler } from '../../middleware/async.js';
import ErrorResponse from '../../utils/errorResponse.js';
import User from '../../models/User.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
/**
 * Get MFA status for the current user
 * @route GET /api/v1/auth/mfa/status
 * @access Private
 */
export const getMFAStatus = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }
    res.status(200).json({
        success: true,
        data: {
            mfaEnabled: user.mfaEnabled || false
        }
    });
});
/**
 * Setup TOTP for the user
 * @route POST /api/v1/auth/mfa/setup
 * @access Private
 */
export const setupTOTP = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }
    // Generate a secret
    const secret = speakeasy.generateSecret({
        name: `MedicalApp:${user.email}`
    });
    // Store the secret temporarily
    user.mfaSecret = secret.base32;
    user.mfaSecretTemp = true;
    await user.save();
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.status(200).json({
        success: true,
        data: {
            secret: secret.base32,
            qrCode: qrCodeUrl
        }
    });
});
/**
 * Verify TOTP code
 * @route POST /api/v1/auth/mfa/verify
 * @access Private
 */
export const verifyTOTP = asyncHandler(async (req, res, next) => {
    const { token } = req.body;
    if (!token) {
        return next(new ErrorResponse('Please provide a token', 400));
    }
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }
    // Verify token against secret
    const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token
    });
    if (!verified) {
        return next(new ErrorResponse('Invalid token', 400));
    }
    res.status(200).json({
        success: true,
        message: 'Token verified successfully'
    });
});
/**
 * Enable MFA for user account
 * @route POST /api/v1/auth/mfa/enable
 * @access Private
 */
export const enableMFA = asyncHandler(async (req, res, next) => {
    const { token } = req.body;
    if (!token) {
        return next(new ErrorResponse('Please provide a token', 400));
    }
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }
    // Verify token against secret
    const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token
    });
    if (!verified) {
        return next(new ErrorResponse('Invalid token', 400));
    }
    // Enable MFA
    user.mfaEnabled = true;
    user.mfaSecretTemp = false;
    await user.save();
    res.status(200).json({
        success: true,
        message: 'MFA enabled successfully'
    });
});
/**
 * Disable MFA for user account
 * @route POST /api/v1/auth/mfa/disable
 * @access Private
 */
export const disableMFA = asyncHandler(async (req, res, next) => {
    const { token } = req.body;
    if (!token) {
        return next(new ErrorResponse('Please provide a token', 400));
    }
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }
    // Verify token against secret
    const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token
    });
    if (!verified) {
        return next(new ErrorResponse('Invalid token', 400));
    }
    // Disable MFA
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save();
    res.status(200).json({
        success: true,
        message: 'MFA disabled successfully'
    });
});
//# sourceMappingURL=mfa.controller.js.map