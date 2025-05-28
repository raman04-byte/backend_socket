import express, { Request, Response } from 'express';
import { WebRTCCallService } from '../services/webrtc_call_service.js';
import { formatError, formatSuccess } from '../../../utils/response.js';
import { logger } from '../../../utils/logger.js';
import { connectToDatabase } from '../../../utils/database.js';

// Create router
export const webrtcRouter = express.Router();

// Add middleware to inject services into request
webrtcRouter.use(async (req: Request, res: Response, next) => {
    try {
        const db = await connectToDatabase();
        req.db = db;
        const webrtcCallService = new WebRTCCallService(db);
        req.webrtcCallService = webrtcCallService;
        next();
    } catch (error) {
        logger.error('Error connecting to database:', error);
        res.status(500).json(formatError('Database connection error', 500));
    }
});

/**
 * @route GET /api/v1/webrtc/calls/:userId
 * @desc Get call history for a user
 * @access Public
 */
webrtcRouter.get('/calls/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json(formatError('User ID is required', 400));
        }

        const calls = await req.webrtcCallService!.getCallsByUserId(userId);
        return res.json(formatSuccess(calls));
    } catch (error) {
        logger.error('Error getting call history:', error);
        return res.status(500).json(formatError('Failed to get call history', 500));
    }
});

/**
 * @route GET /api/v1/webrtc/stats/:organizationId
 * @desc Get call statistics for an organization
 * @access Public
 */
webrtcRouter.get('/stats/:organizationId', async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;

        if (!organizationId) {
            return res.status(400).json(formatError('Organization ID is required', 400));
        }

        const stats = await req.webrtcCallService!.getCallStatsByOrganization(organizationId);
        return res.json(formatSuccess(stats));
    } catch (error) {
        logger.error('Error getting call statistics:', error);
        return res.status(500).json(formatError('Failed to get call statistics', 500));
    }
});

// Adding default export for compatibility
export default webrtcRouter;
