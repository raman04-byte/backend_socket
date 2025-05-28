import { WebRTCCallService } from "../features/webrtc/services/webrtc_call_service.js";
import { DatabaseConnection } from "../utils/database.js";

// Extend Request to include our services
declare module 'express' {
    interface Request {
        db?: DatabaseConnection;
        webrtcCallService?: WebRTCCallService;
    }
}
