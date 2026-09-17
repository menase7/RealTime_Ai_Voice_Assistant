import React, { useEffect, useRef, useState } from 'react';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  User, 
  Mic, 
  Clock, 
  Volume2,
  Cpu
} from 'lucide-react';
import { useVoiceStore } from '../stores/voiceStore';

export default function TranscriptPanel({ sessionId }) {
  const {
    partialTranscript,
    finalTranscripts,
    isProcessing,
    isRecording,
    transcriptsLoading,
    clearTranscripts,
    loadPersistedTranscripts
  } = useVoiceStore();

  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);

  // Load existing persisted transcripts on mount / sessionId change
  useEffect(() => {
    if (sessionId) {
      loadPersistedTranscripts(sessionId);
    }
  }, [sessionId, loadPersistedTranscripts]);

  // Auto-scroll to bottom as new speech chunks arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [partialTranscript, finalTranscripts]);

  const handleCopyTranscript = async () => {
    const fullText = [
      ...finalTranscripts.map((t) => `${t.speaker === 'user' ? 'You' : t.speaker}: ${t.text}`),
      partialTranscript ? `You: ${partialTranscript}` : ''
    ].filter(Boolean).join('\n\n');

    if (!fullText) return;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    // If Unix timestamp in seconds
    const date = typeof ts === 'number' && ts < 10000000000 ? new Date(ts * 1000) : new Date(ts);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const totalWords = finalTranscripts.reduce((acc, curr) => acc + (curr.text ? curr.text.split(/\s+/).length : 0), 0)
    + (partialTranscript ? partialTranscript.split(/\s+/).length : 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-xl flex flex-col">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Speech-to-Text Transcription
              </h3>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AssemblyAI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time speech recognition streaming with partial and final transcripts
            </p>
          </div>
        </div>

        {/* Action buttons & status indicators */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {isProcessing || partialTranscript ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              TRANSCRIBING
            </span>
          ) : isRecording ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Mic className="w-3.5 h-3.5 animate-pulse" />
              LISTENING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              STANDBY
            </span>
          )}

          {(finalTranscripts.length > 0 || partialTranscript) && (
            <>
              <button
                type="button"
                onClick={handleCopyTranscript}
                title="Copy full transcript"
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={clearTranscripts}
                title="Clear transcripts"
                className="text-xs p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transcript Scrolling Feed */}
      <div 
        ref={scrollRef}
        className="bg-slate-950/80 rounded-xl p-4 sm:p-5 border border-slate-800/80 h-[360px] overflow-y-auto space-y-4 custom-scrollbar"
      >
        {transcriptsLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Cpu className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm">Loading session transcripts...</p>
          </div>
        ) : finalTranscripts.length === 0 && !partialTranscript ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
              <Mic className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-300">No transcripts recorded yet</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Press <span className="text-cyan-400 font-semibold">"Start Audio Streaming"</span> and speak into your microphone. Words will appear live below in real-time.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Completed / Final Transcripts */}
            {finalTranscripts.map((item, idx) => (
              <div 
                key={item.id || idx}
                className="group flex flex-col space-y-1 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 transition-all"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-white/5">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </span>
                    <span className="font-semibold text-slate-200 uppercase tracking-wide text-[10px]">
                      {item.speaker === 'user' ? 'You' : item.speaker}
                    </span>
                    <span className="text-emerald-400 font-medium text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      FINAL
                    </span>
                  </div>
                  {item.timestamp && (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {formatTimestamp(item.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-100 leading-relaxed font-normal pt-1">
                  {item.text}
                </p>
              </div>
            ))}

            {/* In-Progress Live Partial Transcript */}
            {partialTranscript && (
              <div className="flex flex-col space-y-1 p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] text-indigo-400 pb-1 border-b border-indigo-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="font-bold text-cyan-300 uppercase tracking-wide text-[10px]">
                      Live Draft (Partial)
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-400/80 italic">in-progress...</span>
                </div>
                <p className="text-sm text-cyan-100 font-medium italic leading-relaxed pt-1">
                  {partialTranscript}
                  <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer statistics */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-mono">
        <div className="flex items-center space-x-4">
          <span>Segments: <strong className="text-slate-300">{finalTranscripts.length}</strong></span>
          <span>Approx Words: <strong className="text-slate-300">{totalWords}</strong></span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>AssemblyAI Streaming (16kHz)</span>
        </div>
      </div>
    </div>
  );
}
