/**
 * Native WebSocket client service for real-time voice sessions.
 * Manages WebSocket lifecycle, state transitions, event dispatching,
 * and transmission of both JSON text frames and raw binary audio frames.
 */
export class VoiceWebSocketService {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.callbacks = {};
  }

  /**
   * Connect to the voice WebSocket endpoint.
   */
  connect(sessionId, token, callbacks = {}) {
    this.disconnect(); // Clean up any prior socket
    this.sessionId = sessionId;
    this.callbacks = callbacks;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/ws/sessions/${sessionId}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      // Handle binary audio chunks as Blobs / ArrayBuffers
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = (event) => {
        if (this.callbacks.onOpen) this.callbacks.onOpen(event);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : { type: 'binary', size: event.data.byteLength };
          if (this.callbacks.onMessage) this.callbacks.onMessage(data);
        } catch (err) {
          if (this.callbacks.onMessage) this.callbacks.onMessage({ type: 'raw', content: event.data });
        }
      };

      this.ws.onerror = (error) => {
        if (this.callbacks.onError) this.callbacks.onError(error);
      };

      this.ws.onclose = (event) => {
        if (this.callbacks.onClose) this.callbacks.onClose(event);
        this.ws = null;
      };
    } catch (error) {
      if (this.callbacks.onError) this.callbacks.onError(error);
    }
  }

  /**
   * Send JSON text control frame over WebSocket.
   */
  send(payload) {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected');
    }
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.ws.send(message);
  }

  /**
   * Send raw binary audio frame (Blob or ArrayBuffer) over WebSocket.
   * Phase 6: MediaRecorder -> WebSocket -> FastAPI.
   */
  sendBinary(binaryData) {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected to stream audio');
    }
    this.ws.send(binaryData);
  }

  /**
   * Disconnect and cleanup WebSocket.
   */
  disconnect() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'User initiated disconnect');
      }
      this.ws = null;
    }
    this.sessionId = null;
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance for app-wide use
export const voiceWsService = new VoiceWebSocketService();
