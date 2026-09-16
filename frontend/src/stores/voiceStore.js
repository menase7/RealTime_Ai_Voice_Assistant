import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { voiceWsService } from '../services/websocket';
import { audioRecorderService } from '../services/audioRecorder';

let durationTimer = null;

export const useVoiceStore = create((set, get) => ({
  // WebSocket State (Phase 4)
  connectionStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  latency: null,
  eventLogs: [],
  error: null,

  // MediaRecorder Audio State (Phase 5)
  isRecording: false,
  recordingDuration: 0,
  audioChunks: [],
  totalAudioBytes: 0,
  audioLevel: 0,
  activeMimeType: '',
  recordingError: null,

  // WebSocket Audio Streaming State (Phase 6)
  isStreamingAudio: false,
  serverChunksReceived: 0,
  serverBytesReceived: 0,

  // Future phase placeholders (Phase 7: AssemblyAI)
  isProcessing: false,
  partialTranscript: '',
  finalTranscripts: [],

  /* =========================================================================
     WebSocket Actions
     ========================================================================= */

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
        // Handle server audio chunk ingestion acknowledgements (Phase 6)
        if (data.type === 'audio_chunk_ack') {
          set({
            serverChunksReceived: data.total_chunks,
            serverBytesReceived: data.total_bytes,
          });

          // Log periodically (every 5th chunk) to keep the visual log clean
          if (data.chunk_index % 5 === 0 || data.chunk_index === 1) {
            get().addLog('received', {
              type: 'audio_chunk_ack',
              chunk: data.chunk_index,
              serverIngestedBytes: data.total_bytes,
            });
          }
          return;
        }

        get().addLog('received', data);

        if (data.type === 'pong' && data.client_timestamp) {
          const roundTrip = Math.round(performance.now() - data.client_timestamp);
          set({ latency: roundTrip });
        }
      },

      onError: () => {
        set({ 
          connectionStatus: 'error', 
          error: 'WebSocket connection encountered an error' 
        });
      },

      onClose: (event) => {
        set({ 
          connectionStatus: 'disconnected',
          latency: null,
          isStreamingAudio: false,
        });
        if (event.code !== 1000) {
          set({ error: `Connection closed (${event.reason || 'Code ' + event.code})` });
        }
      },
    });
  },

  disconnectSession: () => {
    if (get().isRecording) {
      get().stopRecording();
    }
    voiceWsService.disconnect();
    set({
      connectionStatus: 'disconnected',
      latency: null,
      isStreamingAudio: false,
      error: null
    });
  },

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

  addLog: (direction, data) => {
    set((state) => ({
      eventLogs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          direction,
          data,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...state.eventLogs.slice(0, 49),
      ],
    }));
  },

  clearLogs: () => set({ eventLogs: [] }),

  /* =========================================================================
     MediaRecorder Audio Streaming Actions (Phase 5 & 6)
     ========================================================================= */

  startRecording: async () => {
    set({ recordingError: null });

    // Ensure WebSocket is connected before streaming audio
    if (!voiceWsService.isConnected()) {
      set({ 
        recordingError: 'Please wait for WebSocket connection before starting recording' 
      });
      return { success: false, error: 'WebSocket not connected' };
    }

    try {
      // 1. Send start_audio_stream control message over WebSocket
      const startPayload = { type: 'start_audio_stream', timestamp: Date.now() };
      voiceWsService.send(startPayload);
      get().addLog('sent', startPayload);

      // Reset server ingestion telemetry
      set({
        serverChunksReceived: 0,
        serverBytesReceived: 0,
        isStreamingAudio: true,
      });

      // 2. Start hardware microphone capture & chunking
      const result = await audioRecorderService.startRecording({
        timeslice: 250, // 250ms progressive chunks

        onChunk: (chunkBlob, metadata) => {
          // Send raw binary frame directly over WebSocket (Phase 6 core pipeline)
          if (voiceWsService.isConnected()) {
            try {
              voiceWsService.sendBinary(chunkBlob);
            } catch (err) {
              console.error('Error sending audio chunk over WebSocket:', err);
            }
          }

          // Update local chunk statistics
          set((state) => ({
            audioChunks: [metadata, ...state.audioChunks.slice(0, 99)],
            totalAudioBytes: state.totalAudioBytes + metadata.sizeBytes,
          }));
        },

        onAudioLevel: (level) => {
          set({ audioLevel: level });
        },

        onError: (err) => {
          get().stopRecording();
          set({ 
            recordingError: err.message || 'Microphone recording error occurred' 
          });
        },
      });

      // Start duration ticker
      if (durationTimer) clearInterval(durationTimer);
      durationTimer = setInterval(() => {
        set((state) => ({ recordingDuration: state.recordingDuration + 1 }));
      }, 1000);

      set({
        isRecording: true,
        activeMimeType: result.mimeType,
        recordingError: null,
      });

      return { success: true };
    } catch (err) {
      set({
        isRecording: false,
        isStreamingAudio: false,
        recordingError: err.name === 'NotAllowedError' 
          ? 'Microphone permission denied by user' 
          : err.message || 'Failed to initialize microphone',
      });
      return { success: false, error: err.message };
    }
  },

  stopRecording: () => {
    // 1. Stop hardware capture
    audioRecorderService.stopRecording();

    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    // 2. Send stop_audio_stream control event over WebSocket
    if (voiceWsService.isConnected()) {
      try {
        const stopPayload = { 
          type: 'stop_audio_stream', 
          totalChunksEmitted: get().audioChunks.length,
          totalBytesEmitted: get().totalAudioBytes,
          timestamp: Date.now() 
        };
        voiceWsService.send(stopPayload);
        get().addLog('sent', stopPayload);
      } catch (err) {
        // Ignored
      }
    }

    set({
      isRecording: false,
      isStreamingAudio: false,
      audioLevel: 0,
    });
  },

  clearAudioChunks: () => {
    set({
      audioChunks: [],
      totalAudioBytes: 0,
      recordingDuration: 0,
      serverChunksReceived: 0,
      serverBytesReceived: 0,
    });
  },
}));
