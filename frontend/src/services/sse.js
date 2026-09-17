/**
 * Native EventSource service for consuming Server-Sent Events (SSE).
 * Manages EventSource lifecycle, progressive chunk accumulation, custom SSE event listeners,
 * error handling, and clean teardown.
 */
export class AnalysisSSEService {
  constructor() {
    this.eventSource = null;
    this.sessionId = null;
  }

  /**
   * Connect to the analysis SSE streaming endpoint.
   * @param {string} sessionId
   * @param {string} token
   * @param {Object} callbacks
   */
  connect(sessionId, token, { onStart, onStatus, onChunk, onStrength, onWeakness, onSuggestion, onComplete, onError }) {
    this.disconnect(); // Clean up any existing connection
    this.sessionId = sessionId;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const sseUrl = `${apiBaseUrl}/sessions/${sessionId}/analysis/stream?token=${encodeURIComponent(token)}`;

    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onopen = () => {
      if (onStart) onStart({ message: 'SSE connection opened' });
    };

    // Listen for custom SSE events defined by backend
    this.eventSource.addEventListener('start', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onStart) onStart(data);
      } catch (err) {
        console.error('Error parsing start event:', err);
      }
    });

    this.eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onStatus) onStatus(data);
      } catch (err) {
        console.error('Error parsing status event:', err);
      }
    });

    this.eventSource.addEventListener('chunk', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onChunk) onChunk(data);
      } catch (err) {
        console.error('Error parsing chunk event:', err);
      }
    });

    this.eventSource.addEventListener('strength', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onStrength) onStrength(data);
      } catch (err) {
        console.error('Error parsing strength event:', err);
      }
    });

    this.eventSource.addEventListener('weakness', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onWeakness) onWeakness(data);
      } catch (err) {
        console.error('Error parsing weakness event:', err);
      }
    });

    this.eventSource.addEventListener('suggestion', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onSuggestion) onSuggestion(data);
      } catch (err) {
        console.error('Error parsing suggestion event:', err);
      }
    });

    this.eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onComplete) onComplete(data);
      } catch (err) {
        console.error('Error parsing complete event:', err);
      }
      // Server signals end of stream: cleanly close EventSource
      this.disconnect();
    });

    this.eventSource.addEventListener('error', (event) => {
      if (onError) onError(event);
      this.disconnect();
    });

    this.eventSource.onerror = (error) => {
      if (onError) onError(error);
      this.disconnect();
    };
  }

  /**
   * Close the SSE connection and cleanup resources.
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.sessionId = null;
  }

  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }
}

// Export singleton instance for app-wide use
export const analysisSSEService = new AnalysisSSEService();
