import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { voiceWsService } from '../services/websocket';

export const useVoiceStore = create((set, get) => ({
  connectionStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  latency: null,
  eventLogs: [],
  error: null,

  // Future phase placeholders (Phase 5: MediaRecorder, Phase 7: AssemblyAI)
  isRecording: false,
  isProcessing: false,
  partialTranscript: '',
  finalTranscripts: [],

  /**
   * Connect to the session's WebSocket endpoint.
   */
  connectSession: (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ connectionStatus: 'error', error: 'Authentication token missing' });
      return;
    }

    set({ connectionStatus: 'connecting', error: null });

    voiceWsService.connect(sessionId, token, {
      onOpen: () => {
        set({ connectionStatus: 'connected', error: null });
        get().addLog('sent', { type: 'connection_handshake', sessionId });
      },

      onMessage: (data) => {
        get().addLog('received', data);

        // Calculate latency upon receiving a pong message
        if (data.type === 'pong' && data.client_timestamp) {
          const roundTrip = Math.round(performance.now() - data.client_timestamp);
          set({ latency: roundTrip });
        }
      },

      onError: (err) => {
        set({ 
          connectionStatus: 'error', 
          error: 'WebSocket connection encountered an error' 
        });
      },

      onClose: (event) => {
        set({ 
          connectionStatus: 'disconnected',
          latency: null
        });
        if (event.code !== 1000) {
          set({ error: `Connection closed (${event.reason || 'Code ' + event.code})` });
        }
      },
    });
  },

  /**
   * Disconnect the current WebSocket session.
   */
  disconnectSession: () => {
    voiceWsService.disconnect();
    set({
      connectionStatus: 'disconnected',
      latency: null,
      error: null
    });
  },

  /**
   * Send a ping message and measure round-trip time.
   */
  sendPing: () => {
    if (!voiceWsService.isConnected()) return;
    const now = performance.now();
    const payload = { type: 'ping', timestamp: now };
    try {
      voiceWsService.send(payload);
      get().addLog('sent', payload);
    } catch (err) {
      set({ error: err.message });
    }
  },

  /**
   * Send a custom test message.
   */
  sendTestMessage: (content) => {
    if (!voiceWsService.isConnected() || !content.trim()) return;
    const payload = { type: 'test_message', content: content.trim() };
    try {
      voiceWsService.send(payload);
      get().addLog('sent', payload);
    } catch (err) {
      set({ error: err.message });
    }
  },

  /**
   * Append an event to the local diagnostics log.
   */
  addLog: (direction, data) => {
    set((state) => ({
      eventLogs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          direction,
          data,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...state.eventLogs.slice(0, 49), // retain last 50 events
      ],
    }));
  },

  clearLogs: () => set({ eventLogs: [] }),
}));
