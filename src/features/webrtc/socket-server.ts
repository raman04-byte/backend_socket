import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../../utils/logger';
import { WebRTCCallService } from './services/webrtc_call_service';
import { connectToDatabase } from '../../utils/database';

// Track active calls with a map of callId -> { callData } 
const activeCallsMap = new Map();

/**
 * Initializes the WebRTC signaling server using Socket.IO
 * @param server - The HTTP server instance to attach Socket.IO to
 */
export async function initializeWebRTCServer(server: HttpServer): Promise<void> {
    // Initialize database connection
    const dbConnection = await connectToDatabase();
    const webrtcCallService = new WebRTCCallService(dbConnection);

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    // Middleware to extract callerId from the handshake
    io.use((socket, next) => {
        if (socket.handshake.query) {
            const callerId = socket.handshake.query.callerId as string;
            const organizationId = socket.handshake.query.organizationId as string;

            socket.data.user = callerId;
            socket.data.organizationId = organizationId;
            next();
        } else {
            next(new Error('Authentication error'));
        }
    });

    // Connection event handler
    io.on("connection", (socket) => {
        logger.info(`WebRTC: User ${socket.data.user} connected`);
        socket.join(socket.data.user);

        // Handle call initiation
        socket.on("makeCall", async (data) => {
            const calleeId = data.calleeId;
            const sdpOffer = data.sdpOffer;

            logger.debug(`WebRTC: User ${socket.data.user} is calling ${calleeId}`);

            try {
                // Create a new call record in the database
                const callData = {
                    callerId: socket.data.user,
                    calleeId: calleeId,
                    startTime: new Date(),
                    status: 'initiated' as 'initiated',
                    organizationId: socket.data.organizationId || 'default'
                };

                const call = await webrtcCallService.initiateCall(callData);

                // Add detailed logging of call object
                logger.debug('Call object:', JSON.stringify(call, null, 2));

                // Store the call ID in memory for tracking
                activeCallsMap.set(`${socket.data.user}:${calleeId}`, {
                    callId: call.id,
                    startTime: new Date(),
                    status: 'initiated'
                });

                logger.debug('CallerId', socket.data.user);
                logger.debug('CalleeId', calleeId);
                logger.debug('CallID', call.id);

                // Send call data to the callee
                socket.to(calleeId).emit("newCall", {
                    callerId: socket.data.user,
                    sdpOffer: sdpOffer,
                    callId: call.id
                });
            } catch (error) {
                logger.error("Error initiating call:", error);
            }
        });

        // Handle call answer
        socket.on("answerCall", async (data) => {
            const callerId = data.callerId;
            const sdpAnswer = data.sdpAnswer;
            const callId = data.callId;

            logger.debug(`WebRTC: User ${socket.data.user} answered call from ${callerId}`);

            try {
                // Update call status in the database
                if (callId) {
                    await webrtcCallService.connectCall(callId);

                    // Update the in-memory tracking
                    const callKey = `${callerId}:${socket.data.user}`;
                    if (activeCallsMap.has(callKey)) {
                        const callData = activeCallsMap.get(callKey);
                        callData.status = 'connected';
                        activeCallsMap.set(callKey, callData);
                    }
                }

                // Send answer back to the caller
                socket.to(callerId).emit("callAnswered", {
                    callee: socket.data.user,
                    sdpAnswer: sdpAnswer,
                    callId: callId
                });
            } catch (error) {
                logger.error("Error answering call:", error);
            }
        });

        // Handle ICE candidates
        socket.on("IceCandidate", (data) => {
            const calleeId = data.calleeId;
            const iceCandidate = data.iceCandidate;

            logger.debug(`WebRTC: User ${socket.data.user} sent ICE candidate to ${calleeId}`);

            socket.to(calleeId).emit("IceCandidate", {
                sender: socket.data.user,
                iceCandidate: iceCandidate,
            });
        });

        // Handle stream changes (for screen sharing)
        socket.on("streamChanged", (data) => {
            const calleeId = data.calleeId;
            const screenSharing = data.screenSharing;

            logger.debug(`WebRTC: User ${socket.data.user} changed stream status to: screenSharing=${screenSharing}`);

            socket.to(calleeId).emit("streamChanged", {
                sender: socket.data.user,
                screenSharing: screenSharing,
            });
        });

        // Handle stream update request (for screen sharing renegotiation)
        socket.on("updateStream", (data) => {
            const calleeId = data.calleeId;
            const sdpOffer = data.sdpOffer;
            const isScreenSharing = data.isScreenSharing || false;
            const callId = data.callId;

            logger.debug(`WebRTC: User ${socket.data.user} sent stream update to ${calleeId}, screen sharing: ${isScreenSharing}`);

            socket.to(calleeId).emit("streamUpdated", {
                sender: socket.data.user,
                sdpOffer: sdpOffer,
                isScreenSharing: isScreenSharing,
                callId: callId
            });
        });

        // Handle stream update answer (completing the renegotiation)
        socket.on("streamAnswer", (data) => {
            const callerId = data.callerId;
            const sdpAnswer = data.sdpAnswer;

            logger.debug(`WebRTC: User ${socket.data.user} sent stream answer to ${callerId}`);

            socket.to(callerId).emit("streamAnswered", {
                sender: socket.data.user,
                sdpAnswer: sdpAnswer,
            });
        });

        // Handle call end
        socket.on("endCall", async (data) => {
            const calleeId = data.calleeId;
            const callId = data.callId;
            const reason = data.reason || 'ended';
            const endTime = data.endTime || new Date().toISOString();

            logger.debug(`WebRTC: User ${socket.data.user} ended call with ${calleeId}, reason: ${reason}, end time: ${endTime}`);
            logger.debug(`EndCall event data: ${JSON.stringify(data)}`);

            try {
                // Update the call record in the database
                if (callId) {
                    logger.debug(`Calling endCall service with callId: ${callId}, status: ${reason}, endTime: ${endTime}`);
                    const updatedCall = await webrtcCallService.endCall(callId, reason, endTime);
                    logger.debug(`Call updated successfully: ${JSON.stringify(updatedCall)}`);
                } else {
                    logger.warn(`No callId provided in endCall event from user ${socket.data.user}`);
                }

                // Clean up in-memory tracking
                const callKey = `${socket.data.user}:${calleeId}`;
                if (activeCallsMap.has(callKey)) {
                    activeCallsMap.delete(callKey);
                }

                // Notify the other party
                socket.to(calleeId).emit("callEnded", {
                    sender: socket.data.user,
                    reason: reason,
                    callId: callId,
                    endTime: endTime
                });
            } catch (error) {
                logger.error("Error ending call:", error);
            }
        });

        // Handle call rejection
        socket.on("rejectCall", async (data) => {
            const callerId = data.callerId;
            const callId = data.callId;
            const reason = data.reason || 'rejected';
            const endTime = data.endTime || new Date().toISOString();

            logger.debug(`WebRTC: User ${socket.data.user} rejected call from ${callerId}, reason: ${reason}, end time: ${endTime}`);

            try {
                // Update the call record in the database
                if (callId) {
                    await webrtcCallService.endCall(callId, 'rejected', endTime);
                }

                // Clean up in-memory tracking
                const callKey = `${callerId}:${socket.data.user}`;
                if (activeCallsMap.has(callKey)) {
                    activeCallsMap.delete(callKey);
                }

                // Notify the caller
                socket.to(callerId).emit("callRejected", {
                    callee: socket.data.user,
                    reason: reason,
                    callId: callId,
                    endTime: endTime
                });
            } catch (error) {
                logger.error("Error rejecting call:", error);
            }
        });

        // Handle stream refresh request
        socket.on("requestStream", (data) => {
            const calleeId = data.calleeId;
            const callId = data.callId;

            logger.debug(`WebRTC: User ${socket.data.user} requested stream refresh from ${calleeId}`);

            socket.to(calleeId).emit("streamRequested", {
                callerId: socket.data.user,
                callId: callId,
                timestamp: Date.now()
            });
        });

        // Handle disconnection
        socket.on("disconnect", async () => {
            logger.info(`WebRTC: User ${socket.data.user} disconnected`);

            // Find any active calls for this user and mark them as ended
            for (const [key, value] of activeCallsMap.entries()) {
                const [caller, callee] = key.split(':');
                if (caller === socket.data.user || callee === socket.data.user) {
                    try {
                        // Mark call as missed if it was never connected
                        const status = value.status === 'initiated' ? 'missed' : 'ended';
                        const endTime = new Date().toISOString();
                        await webrtcCallService.endCall(value.callId, status, endTime);
                        activeCallsMap.delete(key);

                        // Notify the other party
                        const otherParty = caller === socket.data.user ? callee : caller;
                        socket.to(otherParty).emit("callEnded", {
                            sender: socket.data.user,
                            reason: 'disconnected',
                            callId: value.callId,
                            endTime: endTime
                        });
                    } catch (error) {
                        logger.error("Error handling disconnect for call:", error);
                    }
                }
            }
        });
    });

    logger.info("WebRTC signaling server initialized");
}
