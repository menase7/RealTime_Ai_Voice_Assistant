/**
 * Browser Audio Recording Service using Web Audio API.
 * Captures microphone stream, resamples to 16,000 Hz mono,
 * converts Float32 audio samples into standard 16-bit Linear PCM (little-endian),
 * computes real-time volume levels for the visualizer, and cleanly releases hardware tracks.
 */
export class AudioRecorderService {
  constructor() {
    this.mediaStream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.analyser = null;
    this.animationFrameId = null;
    this.chunkIndex = 0;
    this._isRecording = false;
  }

  /**
   * Request microphone permissions and start recording with progressive PCM16 chunk emission.
   * @param {Object} options
   * @param {number} [options.timeslice=250] - Interval in milliseconds (kept for compatibility).
   * @param {Function} options.onChunk - Callback receiving (pcm16ArrayBuffer, metadata).
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

      // 2. Initialize AudioContext at 16000 Hz
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });

      // Handle suspended audio context (browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 3. Setup AnalyserNode for audio visualization
      this._setupAudioAnalyser(onAudioLevel);

      // 4. Setup ScriptProcessorNode for real-time PCM16 sample extraction
      // Buffer size 4096 gives ~256ms at 16kHz
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this._isRecording) return;

        const inputChannelData = event.inputBuffer.getChannelData(0); // Float32Array

        // Resample if AudioContext is operating at a non-16kHz rate (hardware default)
        let samples16k = inputChannelData;
        if (this.audioContext.sampleRate !== 16000) {
          samples16k = this._downsampleBuffer(inputChannelData, this.audioContext.sampleRate, 16000);
        }

        // Convert Float32Array to 16-bit linear PCM (little-endian)
        const pcm16Buffer = this._floatTo16BitPCM(samples16k);

        this.chunkIndex += 1;
        const chunkMetadata = {
          id: `chunk-${this.chunkIndex}-${Date.now()}`,
          chunkIndex: this.chunkIndex,
          sizeBytes: pcm16Buffer.byteLength,
          mimeType: 'audio/pcm;rate=16000;bits=16',
          timestamp: new Date().toLocaleTimeString(),
        };

        if (onChunk) {
          onChunk(pcm16Buffer, chunkMetadata);
        }
      };

      // Connect pipeline
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this._isRecording = true;
      return { success: true, mimeType: 'audio/pcm;rate=16000;bits=16' };
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
    if (!onAudioLevel || !this.audioContext || !this.sourceNode) return;

    try {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!this.analyser || !this._isRecording) return;
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
   * Convert Float32Array [-1.0, 1.0] to 16-bit linear PCM (little-endian) ArrayBuffer.
   */
  _floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  /**
   * Downsample audio buffer from inputRate to outputRate.
   */
  _downsampleBuffer(buffer, inputRate, outputRate) {
    if (inputRate === outputRate) return buffer;
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  /**
   * Stop recording, stop all microphone hardware tracks, and release resources.
   */
  stopRecording() {
    this._isRecording = false;

    // 1. Cancel audio level animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 2. Disconnect and clean up processor & source
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (err) {}
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (err) {}
      this.sourceNode = null;
    }

    // 3. Stop each track on the MediaStream to turn off microphone LED/indicator
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {}
      });
      this.mediaStream = null;
    }

    // 4. Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (err) {}
      this.audioContext = null;
      this.analyser = null;
    }
  }

  /**
   * Check whether recording is currently in progress.
   */
  isRecording() {
    return this._isRecording;
  }
}

// Export singleton instance
export const audioRecorderService = new AudioRecorderService();
