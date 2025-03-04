import crypto from 'crypto';
import { AppError } from '../utils/appError.js';
// Encryption key management
const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new AppError('Encryption key not found in environment variables', 500);
    }
    // Validate key format
    if (!/^[0-9a-f]{64}$/.test(key)) {
        throw new AppError('Invalid encryption key format - must be 64 hex characters', 500);
    }
    // Convert hex string to Buffer
    const keyBuffer = Buffer.from(key, 'hex');
    // Validate key length
    if (keyBuffer.length !== 32) {
        throw new AppError('Invalid encryption key length - must be 32 bytes', 500);
    }
    return keyBuffer;
};
// Initialization Vector generation
const generateIV = () => {
    return crypto.randomBytes(16);
};
export const encryptData = (data) => {
    try {
        const iv = generateIV();
        const key = getEncryptionKey();
        // Validate key length
        if (key.length !== 32) {
            throw new AppError('Invalid encryption key length', 500);
        }
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encryptedData += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encryptedData,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    catch (error) {
        console.error('Encryption error details:', error);
        throw new AppError(error instanceof AppError ? error.message : 'Encryption failed', 500);
    }
};
export const decryptData = (encryptedData, iv, authTag) => {
    try {
        const key = getEncryptionKey();
        // Validate key length
        if (key.length !== 32) {
            throw new AppError('Invalid encryption key length', 500);
        }
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
        decryptedData += decipher.final('utf8');
        return JSON.parse(decryptedData);
    }
    catch (error) {
        console.error('Decryption error details:', error);
        throw new AppError(error instanceof AppError ? error.message : 'Decryption failed', 500);
    }
};
// Public routes that don't require encryption
const PUBLIC_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/verify-2fa'];
// Middleware to encrypt response data
export const encryptResponse = (req, res, next) => {
    const originalSend = res.json;
    res.json = function (body) {
        // Skip encryption for auth routes and non-production environment
        if (PUBLIC_ROUTES.includes(req.path) || process.env.NODE_ENV !== 'production') {
            return originalSend.call(this, body);
        }
        if (body) {
            try {
                const encrypted = encryptData(body);
                return originalSend.call(this, {
                    data: encrypted.encryptedData,
                    iv: encrypted.iv,
                    authTag: encrypted.authTag
                });
            }
            catch (error) {
                console.error('Response encryption error:', error);
                next(error);
                return this;
            }
        }
        return originalSend.call(this, body);
    };
    next();
    return res;
};
// Middleware to decrypt request data
export const decryptRequest = (req, res, next) => {
    // Skip decryption for auth routes and non-production environment
    if (PUBLIC_ROUTES.includes(req.path) || process.env.NODE_ENV !== 'production') {
        return next();
    }
    if (req.body.data && req.body.iv && req.body.authTag) {
        try {
            const decrypted = decryptData(req.body.data, req.body.iv, req.body.authTag);
            req.body = decrypted;
        }
        catch (error) {
            console.error('Request decryption error:', error);
            return next(new AppError('Invalid encrypted data', 400));
        }
    }
    next();
};
// HIPAA compliance logging middleware
export const hipaaLogger = (req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        userId: req.user?.id || 'unauthenticated',
        action: `${req.method} ${req.path}`,
        resourceType: req.path.split('/')[1], // e.g., 'patients', 'images'
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    };
    // In production, use a HIPAA-compliant logging service
    if (process.env.NODE_ENV === 'production') {
        // Log to HIPAA-compliant service
        console.log('HIPAA Log:', logData);
    }
    next();
};
//# sourceMappingURL=encryption.js.map