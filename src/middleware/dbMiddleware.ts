import { Request, Response, NextFunction } from 'express';
import { connectToDatabase } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to inject database connection into request object
 */
export default async function dbMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // Connect to database if not already connected
        const db = await connectToDatabase();

        // Add database connection to request
        req.db = db;

        next();
    } catch (error) {
        logger.error('Database connection error:', error);
        res.status(500).json({
            success: false,
            error: 'Database connection failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
