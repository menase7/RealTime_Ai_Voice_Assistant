/**
 * Browser Audio Recording Service using the native MediaRecorder and Web Audio APIs.
 * Captures microphone stream, segments audio into progressive timesliced chunks,
 * computes real-time volume levels for visualization, and cleanly releases hardware tracks.
 */
export class AudioRecorderService {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.animationFrameId = null;
    this.chunkIndex = 0;
  }

  /**
   * Determine the most suitable supported audio MIME type for streaming.
   */
  static getSupportedMimeType() {
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Browser default fallback
  }

  /**
   * Request microphone permissions and start recording with progressive chunk emission.
   * @param {Object} options
   * @param {number} [options.timeslice=250] - Interval in milliseconds to emit audio chunks.
   * @param {Function} options.onChunk - Callback receiving (blob, metadata).
   * @param {Function} options.onAudioLevel - Callback receiving volume level (0-100).
   * @param {Function} options.onError - Callback on recording failure.
   */
  async startRecording({ timeslice = 250, onChunk, onAudioLevel, onError }) {
    this.stopRecording(); // Ensure any prior stream is terminated
    this.chunkIndex = 0;

    try {
      // 1. Request microphone access with modern speech enhancement constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // 2. Initialize Web Audio Analyser for real-time visualizer volume monitoring
      this._setupAudioAnalyser(onAudioLevel);

      // 3. Configure native MediaRecorder with preferred MIME type
      const mimeType = AudioRecorderService.getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      // 4. Progressive chunk emission listener
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunkIndex += 1;
          const chunkMetadata = {
            id: `chunk-${this.chunkIndex}-${Date.now()}`,
            chunkIndex: this.chunkIndex,
            sizeBytes: event.data.size,
            mimeType: event.data.type || mimeType || 'audio/webm',
            timestamp: new Date().toLocaleTimeString(),
          };

          if (onChunk) {
            onChunk(event.data, chunkMetadata);
          }
        }
      };

      this.mediaRecorder.onerror = (err) => {
        if (onError) onError(err);
      };

      // 5. Start timesliced chunk generation
      this.mediaRecorder.start(timeslice);
      return { success: true, mimeType: this.mediaRecorder.mimeType };
    } catch (err) {
      this.stopRecording();
      if (onError) onError(err);
      throw err;
    }
  }

  /**
   * Connect an AnalyserNode to compute root-mean-square (RMS) volume levels.
   */
  _setupAudioAnalyser(onAudioLevel) {
    if (!onAudioLevel || !this.mediaStream) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));

        onAudioLevel(normalized);
        this.animationFrameId = requestAnimationFrame(updateLevel);
      };

      this.animationFrameId = requestAnimationFrame(updateLevel);
    } catch (err) {
      console.warn('AudioContext visualization setup skipped:', err);
    }
  }

  /**
   * Stop recording, stop all microphone hardware tracks, and release resources.
   */
  stopRecording() {
    // 1. Cancel audio level animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 2. Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        // Ignored if already stopped
      }
      this.mediaRecorder = null;
    }

    // 3. Stop each track on the MediaStream to turn off OS/browser microphone indicator
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          // Ignored
        }
      });
      this.mediaStream = null;
    }

    // 4. Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (err) {
        // Ignored
      }
      this.audioContext = null;
      this.analyser = null;
    }
  }

  /**
   * Check whether recording is currently in progress.
   */
  isRecording() {
    return this.mediaRecorder && this.mediaRecorder.state === 'recording';
  }
}

// Export singleton instance
export const audioRecorderService = new AudioRecorderService();
