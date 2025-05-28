export interface WebRTCCall {
    id: string;
    callerId: string;
    calleeId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number; // in seconds
    status: 'initiated' | 'connected' | 'ended' | 'missed' | 'rejected';
    organizationId: string; // For multi-tenant support
    createdAt: Date;
    updatedAt: Date;
}

export const defaultWebRTCCall: Partial<WebRTCCall> = {
    status: 'initiated',
    createdAt: new Date(),
    updatedAt: new Date()
};
