# WebRTC Socket Server

A standalone WebRTC signaling server built with Socket.IO, extracted from the larger Master_NodeServer_API_Function project.

## Overview

This server provides WebRTC signaling functionality via Socket.IO, enabling peer-to-peer video/audio communication between clients. It manages call signaling, connection negotiation, and call recording.

## Features

- WebRTC signaling with Socket.IO
- Call state management
- Call history tracking
- In-memory data storage
- REST API for call statistics and history

## Technology Stack

- Node.js
- TypeScript
- Express.js
- Socket.IO
- In-memory data storage

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Testing

### WebRTC Test Client

A test client page is available at http://localhost:3001/test_client.html. This page allows you to:

1. Connect two simulated users
2. Make calls between them
3. Test screen sharing
4. Test various call controls

### API Test Script

You can test the REST API endpoints using the provided script:

```bash
node scripts/test_api.js
```

## API Endpoints

### WebRTC Call History

- `GET /api/v1/webrtc/calls/:userId` - Get call history for a specific user

### WebRTC Call Statistics

- `GET /api/v1/webrtc/stats/:organizationId` - Get call statistics for an organization

## Socket.IO Events

### Client to Server Events

- `makeCall` - Initiate a call to another user
- `answerCall` - Answer an incoming call
- `endCall` - End an ongoing call
- `rejectCall` - Reject an incoming call
- `IceCandidate` - Send ICE candidates for connection negotiation
- `streamChanged` - Notify about stream changes (e.g., screen sharing)
- `updateStream` - Update stream for renegotiation
- `streamAnswer` - Answer to a stream update
- `requestStream` - Request stream refresh

### Server to Client Events

- `newCall` - Notify about an incoming call
- `callAnswered` - Notify that the call was answered
- `callEnded` - Notify that the call was ended
- `callRejected` - Notify that the call was rejected
- `IceCandidate` - Relay ICE candidates
- `streamChanged` - Relay stream change status
- `streamUpdated` - Relay stream update
- `streamAnswered` - Relay stream answer
- `streamRequested` - Relay stream refresh request

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DEBUG_LOGS` - Enable debug logging (true/false)

## License

MIT
