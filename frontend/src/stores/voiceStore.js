import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { voiceWsService } from '../services/websocket';
import { audioRecorderService } from '../services/audioRecorder';
import { apiGetSessionTranscripts } from '../services/api';

let durationTimer = null;
let reconnectTimer = null;

export const useVoiceStore = create((set, get) => ({
  /* =========================================================================
     1. WebSocket Lifecycle & Connection State (Phase 8 Enhanced)
     ========================================================================= */
  // Connection states: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  connectionStatus: 'disconnected',
  activeSessionId: null,
  isManualDisconnect: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  latency: null,
  eventLogs: [],
  error: null,

  /* =========================================================================
     2. Microphone & Audio Recording State (Phase 8 Enhanced)
     ========================================================================= */
  // Recording states: 'idle' | 'starting' | 'recording' | 'stopping' | 'error'
  recordingStatus: 'idle',
  isRecording: false,
  recordingDuration: 0,
  audioChunks: [],
  totalAudioBytes: 0,
  audioLevel: 0,
  activeMimeType: '',
  recordingError: null,

  /* =========================================================================
     3. WebSocket Audio Streaming Telemetry (Phase 6 & 8)
     ========================================================================= */
  isStreamingAudio: false,
  serverChunksReceived: 0,
  serverBytesReceived: 0,

  /* =========================================================================
     4. AssemblyAI Streaming Transcripts State (Phase 7 & 8)
     ========================================================================= */
  isProcessing: false,
  partialTranscript: '',
  finalTranscripts: [],
  transcriptsLoading: false,

  /* =========================================================================
     WebSocket Actions & Reconnection Strategy
     ========================================================================= */

  connectSession: (sessionId) => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ 
        connectionStatus: 'error', 
        error: 'Authentication token missing. Please sign in again.' 
      });
      return;
    }

    const currentStatus = get().connectionStatus;
    const isReconnecting = currentStatus === 'reconnecting';

    set({ 
      activeSessionId: sessionId,
      isManualDisconnect: false,
      connectionStatus: isReconnecting ? 'reconnecting' : 'connecting', 
      error: null 
    });

    voiceWsService.connect(sessionId, token, {
      onOpen: () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        set({ 
          connectionStatus: 'connected', 
          reconnectAttempts: 0,
          error: null 
        });

        get().addLog('sent', { 
          type: 'connection_handshake', 
          sessionId, 
          status: 'connected' 
        });
      },

      onMessage: (data) => {
        // A. Audio chunk ingestion acknowledgement
        if (data.type === 'audio_chunk_ack') {
          set({
            serverChunksReceived: data.total_chunks,
            serverBytesReceived: data.total_bytes,
          });

          // Log periodically to prevent memory bloat
          if (data.chunk_index % 5 === 0 || data.chunk_index === 1) {
            get().addLog('received', {
              type: 'audio_chunk_ack',
              chunk: data.chunk_index,
              serverIngestedBytes: data.total_bytes,
            });
          }
          return;
        }

        // B. Live partial transcript (in-progress speech)
        if (data.type === 'transcript_partial') {
          set({
            partialTranscript: data.text || '',
            isProcessing: Boolean(data.text && data.text.trim()),
          });
          return;
        }

        // C. Finalized speech transcript (completed turn, saved in DB)
        if (data.type === 'transcript_final') {
          const newFinal = {
            id: data.id || Math.random().toString(36).substring(2, 9),
            text: data.text,
            speaker: data.speaker || 'user',
            timestamp: data.timestamp || Date.now() / 1000,
          };

          set((state) => ({
            finalTranscripts: [...state.finalTranscripts, newFinal],
            partialTranscript: '', // Clear partial so it never duplicates
            isProcessing: false,
          }));

          get().addLog('received', {
            type: 'transcript_final',
            speaker: newFinal.speaker,
            text: newFinal.text,
          });
          return;
        }

        // D. AssemblyAI service error
        if (data.type === 'assemblyai_error') {
          set({
            recordingError: `AssemblyAI: ${data.message}`,
            isProcessing: false,
          });
          get().addLog('received', data);
          return;
        }

        // E. Latency measurement (ping/pong)
        if (data.type === 'pong' && data.client_timestamp) {
          const roundTrip = Math.round(performance.now() - data.client_timestamp);
          set({ latency: roundTrip });
        }

        get().addLog('received', data);
      },

      onError: () => {
        set({ 
          error: 'WebSocket connection encountered an error' 
        });
      },

      onClose: (event) => {
        const { isManualDisconnect, reconnectAttempts, maxReconnectAttempts, activeSessionId } = get();

        // 1. If user intentionally disconnected or session was closed normally
        if (isManualDisconnect || event.code === 1000) {
          set({ 
            connectionStatus: 'disconnected',
            latency: null,
            isStreamingAudio: false,
            reconnectAttempts: 0,
          });
          return;
        }

        // 2. Unexpected disconnect: Trigger Reconnecting State with Exponential Backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const nextAttempt = reconnectAttempts + 1;
          const delay = Math.min(1000 * Math.pow(1.5, nextAttempt - 1), 10000);

          set({
            connectionStatus: 'reconnecting',
            reconnectAttempts: nextAttempt,
            latency: null,
            isStreamingAudio: false,
            error: `Connection lost (${event.reason || 'Code ' + event.code}). Reconnecting (attempt ${nextAttempt}/${maxReconnectAttempts})...`
          });

          get().addLog('system', {
            type: 'reconnecting',
            attempt: nextAttempt,
            maxAttempts: maxReconnectAttempts,
            retryInMs: Math.round(delay),
          });

          reconnectTimer = setTimeout(() => {
            if (!get().isManualDisconnect && activeSessionId) {
              get().connectSession(activeSessionId);
            }
          }, delay);
        } else {
          // Reconnection attempts exhausted
          set({
            connectionStatus: 'error',
            latency: null,
            isStreamingAudio: false,
            error: `Failed to reconnect after ${maxReconnectAttempts} attempts. Please check your connection and click Retry.`
          });
        }
      },
    });
  },

  /**
   * Manually trigger immediate reconnect.
   */
  reconnectSession: () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    set({ 
      reconnectAttempts: 0, 
      connectionStatus: 'connecting', 
      error: null 
    });

    get().connectSession(activeSessionId);
  },

  /**
   * Intentionally close connection and cleanup all listeners and timers.
   */
  disconnectSession: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (get().isRecording) {
      get().stopRecording();
    }

    set({ isManualDisconnect: true });
    voiceWsService.disconnect();

    set({
      connectionStatus: 'disconnected',
      latency: null,
      isStreamingAudio: false,
      reconnectAttempts: 0,
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
     Microphone Audio Recording & PCM16 Streaming Actions
     ========================================================================= */

  startRecording: async () => {
    set({ 
      recordingStatus: 'starting', 
      recordingError: null 
    });

    // Ensure WebSocket is connected before streaming audio
    if (!voiceWsService.isConnected()) {
      const err = 'Please wait for WebSocket connection before starting recording';
      set({ 
        recordingStatus: 'error',
        recordingError: err 
      });
      return { success: false, error: err };
    }

    try {
      // 1. Send start_audio_stream control message over WebSocket
      const startPayload = { type: 'start_audio_stream', timestamp: Date.now() };
      voiceWsService.send(startPayload);
      get().addLog('sent', startPayload);

      // Reset telemetry
      set({
        serverChunksReceived: 0,
        serverBytesReceived: 0,
        isStreamingAudio: true,
      });

      // 2. Start hardware microphone capture & PCM16 chunk streaming
      const result = await audioRecorderService.startRecording({
        timeslice: 250,

        onChunk: (pcm16Buffer, metadata) => {
          if (voiceWsService.isConnected()) {
            try {
              voiceWsService.sendBinary(pcm16Buffer);
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
            recordingStatus: 'error',
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
        recordingStatus: 'recording',
        isRecording: true,
        activeMimeType: result.mimeType,
        recordingError: null,
      });

      return { success: true };
    } catch (err) {
      set({
        recordingStatus: 'error',
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
    set({ recordingStatus: 'stopping' });

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
      recordingStatus: 'idle',
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

  /* =========================================================================
     AssemblyAI Transcripts & Persistence Actions
     ========================================================================= */

  clearTranscripts: () => {
    set({
      partialTranscript: '',
      finalTranscripts: [],
      isProcessing: false,
    });
  },

  loadPersistedTranscripts: async (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token || !sessionId) return;

    set({ transcriptsLoading: true });
    try {
      const records = await apiGetSessionTranscripts(token, sessionId);
      const formatted = records.map((r) => ({
        id: r.id,
        text: r.content,
        speaker: r.speaker || 'user',
        timestamp: r.timestamp || new Date(r.created_at).getTime() / 1000,
        createdAt: r.created_at,
      }));
      set({ finalTranscripts: formatted, transcriptsLoading: false });
    } catch (err) {
      console.warn('Failed to load persisted transcripts:', err.message);
      set({ transcriptsLoading: false });
    }
  },

  /**
   * Reset store state cleanly when changing or exiting sessions.
   */
  resetSessionState: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    audioRecorderService.stopRecording();
    voiceWsService.disconnect();

    set({
      connectionStatus: 'disconnected',
      activeSessionId: null,
      isManualDisconnect: false,
      reconnectAttempts: 0,
      latency: null,
      eventLogs: [],
      error: null,

      recordingStatus: 'idle',
      isRecording: false,
      recordingDuration: 0,
      audioChunks: [],
      totalAudioBytes: 0,
      audioLevel: 0,
      activeMimeType: '',
      recordingError: null,

      isStreamingAudio: false,
      serverChunksReceived: 0,
      serverBytesReceived: 0,

      isProcessing: false,
      partialTranscript: '',
      finalTranscripts: [],
      transcriptsLoading: false,
    });
  },
}));
