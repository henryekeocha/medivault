import { z } from 'zod';
import { AppError } from '../utils/appError.js';
export const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            const validatedBody = await schema.parseAsync(req.body);
            req.body = validatedBody;
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                next(new AppError(`Validation error: ${error.errors[0].message}`, 400));
            }
            else {
                next(error);
            }
        }
    };
};
//# sourceMappingURL=validation.js.map