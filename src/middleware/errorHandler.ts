import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { formatError } from '../utils/response.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error(`Error ${statusCode}: ${message}`, err.stack || err);

    res.status(statusCode).json(formatError(message, statusCode));
};
