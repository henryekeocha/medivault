import { prisma } from '../lib/prisma.js';
export const hipaaLogger = (req, res, next) => {
    const oldWrite = res.write;
    const oldEnd = res.end;
    const chunks = [];
    res.write = function (chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        return oldWrite.apply(res, arguments);
    };
    res.end = function (chunk, encoding, callback) {
        if (chunk) {
            chunks.push(Buffer.from(chunk));
        }
        const responseBody = Buffer.concat(chunks).toString('utf8');
        // Create audit log asynchronously to not block the response
        prisma.auditLog.create({
            data: {
                userId: req.user?.id,
                action: `${req.method}_${req.originalUrl}`,
                details: {
                    type: 'API_REQUEST',
                    method: req.method,
                    url: req.originalUrl,
                    requestBody: req.body,
                    responseBody: responseBody,
                    headers: req.headers,
                    ip: req.ip
                }
            }
        }).catch(err => console.error('Error creating audit log:', err));
        return oldEnd.apply(res, arguments);
    };
    next();
};
//# sourceMappingURL=hipaaLogger.js.map