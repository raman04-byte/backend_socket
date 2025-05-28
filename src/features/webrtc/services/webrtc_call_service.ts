import { logger } from '../../../utils/logger.js';
import { DatabaseConnection, inMemoryDatabase } from '../../../utils/database.js';
import crypto from 'crypto';
import { WebRTCCall } from '../../../models/webrtc_call_model.js';

export class WebRTCCallService {
    constructor(public dbConnection: DatabaseConnection) { }

    /**
     * Initializes a new call record in the database
     */
    async initiateCall(callData: Partial<WebRTCCall>): Promise<WebRTCCall> {
        try {
            const id = crypto.randomUUID();

            const call: WebRTCCall = {
                id,
                callerId: callData.callerId!,
                calleeId: callData.calleeId!,
                startTime: callData.startTime || new Date(),
                status: callData.status || 'initiated',
                organizationId: callData.organizationId || 'default',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Store in in-memory database
            inMemoryDatabase.webrtcCalls.set(id, call);

            logger.info(`Call initiated: ${id} from ${callData.callerId} to ${callData.calleeId}`);

            return call;
        } catch (error) {
            logger.error('Error initiating WebRTC call record:', error);
            throw error;
        }
    }

    /**
     * Updates the call status to 'connected' when the call is answered
     */
    async connectCall(callId: string): Promise<WebRTCCall> {
        try {
            // Get the call from in-memory database
            const call = inMemoryDatabase.webrtcCalls.get(callId);

            if (!call) {
                throw new Error(`Call record not found: ${callId}`);
            }

            // Update call status
            call.status = 'connected';
            call.updatedAt = new Date();

            // Store updated call back in in-memory database
            inMemoryDatabase.webrtcCalls.set(callId, call);

            logger.info(`Call connected: ${callId}`);
            return call;
        } catch (error) {
            logger.error(`Error connecting WebRTC call ${callId}:`, error);
            throw error;
        }
    }

    /**
     * Updates the call record when the call ends
     */
    async endCall(callId: string, status: 'ended' | 'missed' | 'rejected' = 'ended', endTime?: string): Promise<WebRTCCall> {
        try {
            // Use provided endTime or create a new one if not provided
            const callEndTime = endTime ? new Date(endTime) : new Date();

            // Get the call from in-memory database
            const call = inMemoryDatabase.webrtcCalls.get(callId);

            if (!call) {
                throw new Error(`Call record not found: ${callId}`);
            }

            const startTime = new Date(call.startTime);
            const duration = Math.round((callEndTime.getTime() - startTime.getTime()) / 1000); // Duration in seconds

            logger.debug(`Updating call ${callId} - Status: ${status}, End time: ${callEndTime.toISOString()}, Duration: ${duration}s`);

            // Update call record
            call.status = status;
            call.endTime = callEndTime;
            call.duration = duration;
            call.updatedAt = new Date();

            // Store updated call back in in-memory database
            inMemoryDatabase.webrtcCalls.set(callId, call);

            logger.info(`Call ${status}: ${callId}, duration: ${duration}s, end time: ${callEndTime.toISOString()}`);
            return call;
        } catch (error) {
            logger.error(`Error ending WebRTC call ${callId}:`, error);
            throw error;
        }
    }

    /**
     * Get all call records for a specific user (as caller or callee)
     */
    async getCallsByUserId(userId: string): Promise<WebRTCCall[]> {
        try {
            const calls: WebRTCCall[] = [];

            // Filter calls where the user is either caller or callee
            for (const call of inMemoryDatabase.webrtcCalls.values()) {
                if (call.callerId === userId || call.calleeId === userId) {
                    calls.push(call);
                }
            }

            // Sort by start time descending
            return calls.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        } catch (error) {
            logger.error(`Error getting WebRTC calls for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get call statistics for a specific organization
     */
    async getCallStatsByOrganization(organizationId: string): Promise<any> {
        try {
            let totalCalls = 0;
            let answeredCalls = 0;
            let missedCalls = 0;
            let totalDuration = 0;

            // Collect stats for this organization
            for (const call of inMemoryDatabase.webrtcCalls.values()) {
                if (call.organizationId === organizationId) {
                    totalCalls++;

                    if (call.status === 'connected' || call.status === 'ended') {
                        answeredCalls++;
                    }

                    if (call.status === 'missed' || call.status === 'rejected') {
                        missedCalls++;
                    }

                    totalDuration += call.duration || 0;
                }
            }

            const avgDuration = answeredCalls > 0 ? totalDuration / answeredCalls : 0;

            return {
                totalCalls,
                answeredCalls,
                missedCalls,
                totalDuration,
                avgDuration
            };
        } catch (error) {
            logger.error(`Error getting WebRTC call stats for organization ${organizationId}:`, error);
            throw error;
        }
    }
}
