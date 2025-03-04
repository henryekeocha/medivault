import { FileService } from '../services/file.service.js';
import { AppError } from '../utils/appError.js';
import { hipaaLogger } from '../middleware/hipaaLogger.js';
// Initialize file service
const fileService = new FileService();
export const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError('No file uploaded', 400));
        }
        if (!req.user) {
            return next(new AppError('Not authenticated', 401));
        }
        const { metadata } = req.body;
        const parsedMetadata = metadata ? JSON.parse(metadata) : {};
        // Create HIPAA log entry
        const logEntry = {
            action: 'FILE_UPLOAD',
            userId: req.user.id.toString(),
            resourceType: 'FILE',
            details: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
            },
        };
        // Log the action
        await hipaaLogger(req, res, () => {
            console.log('HIPAA Log:', logEntry);
        });
        const result = await fileService.uploadFile(req.file, req.user.id.toString(), parsedMetadata);
        res.status(201).json({
            status: 'success',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
export const downloadFile = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new AppError('Not authenticated', 401));
        }
        const { fileId } = req.params;
        const { encryptionKey } = req.query;
        if (!encryptionKey || typeof encryptionKey !== 'string') {
            return next(new AppError('Encryption key is required', 400));
        }
        const { data, metadata } = await fileService.downloadFile(fileId, encryptionKey);
        // Create HIPAA log entry
        const logEntry = {
            action: 'FILE_DOWNLOAD',
            userId: req.user.id.toString(),
            resourceType: 'FILE',
            resourceId: fileId,
            details: {
                fileName: metadata.originalName,
                fileType: metadata.mimeType,
            },
        };
        // Log the action
        await hipaaLogger(req, res, () => {
            console.log('HIPAA Log:', logEntry);
        });
        res.setHeader('Content-Type', metadata.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
        res.send(data);
    }
    catch (error) {
        next(error);
    }
};
export const deleteFile = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new AppError('Not authenticated', 401));
        }
        const { fileId } = req.params;
        await fileService.deleteFile(fileId);
        // Create HIPAA log entry
        const logEntry = {
            action: 'FILE_DELETE',
            userId: req.user.id.toString(),
            resourceType: 'FILE',
            resourceId: fileId,
        };
        // Log the action
        await hipaaLogger(req, res, () => {
            console.log('HIPAA Log:', logEntry);
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=file.controller.js.map