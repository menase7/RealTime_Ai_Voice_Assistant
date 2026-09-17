import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { analysisSSEService } from '../services/sse';
import { apiGetSessionAnalysis, apiDeleteSessionAnalysis } from '../services/api';

export const useAnalysisStore = create((set, get) => ({
  // SSE Streaming State (Phase 10)
  isStreaming: false,
  streamStatus: '',
  summary: '',
  strengths: [],
  weaknesses: [],
  suggestions: [],
  isCompleted: false,
  error: null,
  streamEventsLog: [],

  // Saved Analysis Persistence State (Phase 11)
  savedAnalysis: null,
  isLoadingSaved: false,

  /**
   * Fetch saved AI analysis from database for a given session.
   */
  fetchSavedAnalysis: async (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token || !sessionId) return;

    set({ isLoadingSaved: true, error: null });
    try {
      const data = await apiGetSessionAnalysis(token, sessionId);
      set({
        savedAnalysis: data,
        summary: data.summary || '',
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        suggestions: data.suggestions || [],
        isCompleted: true,
        isLoadingSaved: false,
      });
    } catch (err) {
      // If 404 (not yet analyzed), quietly set savedAnalysis to null
      if (err.message && (err.message.includes('404') || err.message.includes('No AI analysis'))) {
        set({
          savedAnalysis: null,
          isLoadingSaved: false,
        });
      } else {
        set({
          savedAnalysis: null,
          isLoadingSaved: false,
          error: err.message || 'Failed to load saved analysis',
        });
      }
    }
  },

  /**
   * Delete saved AI analysis for a session.
   */
  deleteSavedAnalysis: async (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token || !sessionId) return;

    try {
      await apiDeleteSessionAnalysis(token, sessionId);
      set({
        savedAnalysis: null,
        summary: '',
        strengths: [],
        weaknesses: [],
        suggestions: [],
        isCompleted: false,
      });
    } catch (err) {
      set({ error: err.message || 'Failed to delete saved analysis' });
    }
  },

  /**
   * Start Server-Sent Events (SSE) stream for session analysis.
   */
  startAnalysisStream: (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Authentication required to stream analysis.' });
      return;
    }

    // Reset current streaming state while preserving any previously saved analysis
    set({
      isStreaming: true,
      streamStatus: 'Connecting to analysis SSE stream...',
      summary: '',
      strengths: [],
      weaknesses: [],
      suggestions: [],
      isCompleted: false,
      error: null,
      streamEventsLog: [
        {
          id: Math.random().toString(36).substring(2, 9),
          type: 'connecting',
          message: 'Connecting to Server-Sent Events endpoint...',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    });

    const addEvent = (type, message) => {
      set((state) => ({
        streamEventsLog: [
          {
            id: Math.random().toString(36).substring(2, 9),
            type,
            message,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...state.streamEventsLog.slice(0, 29),
        ],
      }));
    };

    analysisSSEService.connect(sessionId, token, {
      onStart: (data) => {
        set({ streamStatus: data?.message || 'SSE stream active' });
        addEvent('start', data?.message || 'SSE stream established');
      },

      onStatus: (data) => {
        set({ streamStatus: data?.message || 'Processing analysis...' });
        addEvent('status', data?.message || 'Processing...');
      },

      onChunk: (data) => {
        if (data.field === 'summary' && data.delta) {
          set((state) => ({ summary: state.summary + data.delta }));
        }
      },

      onStrength: (data) => {
        set((state) => ({
          strengths: [...state.strengths, data.text],
        }));
        addEvent('strength', `Strength: ${data.text}`);
      },

      onWeakness: (data) => {
        set((state) => ({
          weaknesses: [...state.weaknesses, data.text],
        }));
        addEvent('weakness', `Opportunity: ${data.text}`);
      },

      onSuggestion: (data) => {
        set((state) => ({
          suggestions: [...state.suggestions, data.text],
        }));
        addEvent('suggestion', `Suggestion: ${data.text}`);
      },

      onComplete: (data) => {
        const finalSummary = data.summary || get().summary;
        const finalStrengths = data.strengths || get().strengths;
        const finalWeaknesses = data.weaknesses || get().weaknesses;
        const finalSuggestions = data.suggestions || get().suggestions;

        set({
          isStreaming: false,
          isCompleted: true,
          streamStatus: 'Analysis completed & saved to database',
          summary: finalSummary,
          strengths: finalStrengths,
          weaknesses: finalWeaknesses,
          suggestions: finalSuggestions,
          savedAnalysis: {
            id: data.id,
            session_id: sessionId,
            summary: finalSummary,
            strengths: finalStrengths,
            weaknesses: finalWeaknesses,
            suggestions: finalSuggestions,
            created_at: data.created_at || new Date().toISOString(),
          },
        });
        addEvent('complete', 'SSE analysis stream completed and saved to PostgreSQL');
      },

      onError: () => {
        set({
          isStreaming: false,
          error: 'SSE stream connection encountered an error or was closed by server.',
        });
        addEvent('error', 'SSE stream connection closed or failed');
      },
    });
  },

  /**
   * Stop and close the EventSource connection.
   */
  stopAnalysisStream: () => {
    analysisSSEService.disconnect();
    set({
      isStreaming: false,
      streamStatus: 'Stream cancelled by user',
    });
  },

  /**
   * Reset analysis state cleanly.
   */
  resetAnalysis: () => {
    analysisSSEService.disconnect();
    set({
      isStreaming: false,
      streamStatus: '',
      summary: '',
      strengths: [],
      weaknesses: [],
      suggestions: [],
      isCompleted: false,
      error: null,
      streamEventsLog: [],
      savedAnalysis: null,
      isLoadingSaved: false,
    });
  },
}));
