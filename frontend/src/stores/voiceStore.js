// Zustand Voice Store (To be implemented in Phase 8)
import { create } from 'zustand';

export const useVoiceStore = create((set) => ({
  connectionStatus: 'disconnected',
  isRecording: false,
  partialTranscript: '',
  finalTranscripts: [],
}));
