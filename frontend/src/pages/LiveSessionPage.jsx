import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  Send, 
  Activity, 
  Layers, 
  Mic, 
  MicOff, 
  ArrowLeft, 
  Trash2,
  AlertCircle,
  Clock,
  HardDrive,
  FileAudio,
  Server,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { useVoiceStore } from '../stores/voiceStore';
import AudioVisualizer from '../components/AudioVisualizer';

export default function LiveSessionPage() {
  const { sessionId } = useParams();
  const { currentSession, fetchSessionById } = useSessionStore();
  const { 
    // WebSocket state
    connectionStatus, 
    latency, 
    eventLogs, 
    error: wsError, 
    connectSession, 
    disconnectSession, 
    sendPing, 
    sendTestMessage,
    clearLogs,

    // MediaRecorder audio state (Phase 5)
    isRecording,
    recordingDuration,
    audioChunks,
    totalAudioBytes,
    audioLevel,
    activeMimeType,
    recordingError,
    startRecording,
    stopRecording,
    clearAudioChunks,

    // Audio Streaming state (Phase 6)
    isStreamingAudio,
    serverChunksReceived,
    serverBytesReceived
  } = useVoiceStore();

  const [inputMessage, setInputMessage] = useState('');

  // 1. Fetch session details and initiate WebSocket connection
  useEffect(() => {
    if (sessionId) {
      fetchSessionById(sessionId);
      connectSession(sessionId);
    }

    // Teardown: Stop microphone hardware tracks and close WebSocket on unmount
    return () => {
      stopRecording();
      disconnectSession();
    };
  }, [sessionId, fetchSessionById, connectSession, disconnectSession, stopRecording]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendTestMessage(inputMessage);
    setInputMessage('');
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // Format seconds into MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format bytes into KB / MB
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    if (bytes < k) return `${bytes} B`;
    const kb = (bytes / k).toFixed(1);
    return `${kb} KB`;
  };

  // Sync health ratio
  const syncRatio = audioChunks.length > 0 
    ? Math.min(100, Math.round((serverChunksReceived / audioChunks.length) * 100))
    : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/sessions"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {currentSession?.title || 'Live Voice Session'}
              </h2>

              {/* WebSocket Status Badge */}
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  CONNECTED
                </span>
              ) : isConnecting ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  CONNECTING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  DISCONNECTED
                </span>
              )}

              {/* Streaming Audio Status Badge (Phase 6) */}
              {isStreamingAudio ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                  STREAMING AUDIO (FastAPI)
                </span>
              ) : isRecording ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  RECORDING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                  MIC IDLE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {sessionId} • WebSocket Audio Streaming Active
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {isConnected ? (
            <button
              onClick={disconnectSession}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            >
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={() => connectSession(sessionId)}
              disabled={isConnecting}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Errors Banner */}
      {(wsError || recordingError) && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{recordingError || wsError}</span>
        </div>
      )}

      {/* MediaRecorder Audio Studio Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
              Phase 6: MediaRecorder → WebSocket → FastAPI Pipeline
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Real-Time Microphone Audio Streaming
            </h3>
            <p className="text-xs text-slate-400 max-w-lg">
              Binary audio slices stream directly into FastAPI over the active WebSocket channel with progressive server ingestion acknowledgements.
            </p>
          </div>

          {/* Prominent Microphone Control Button */}
          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={handleToggleRecording}
              className={`relative group w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/50 scale-105 animate-pulse'
                  : 'bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 hover:scale-105 active:scale-95'
              }`}
            >
              {isRecording && (
                <span className="absolute -inset-2 rounded-full border-2 border-rose-500/40 animate-ping" />
              )}
              {isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
            <span className="text-xs font-semibold tracking-wide uppercase text-slate-300">
              {isRecording ? 'Stop & Finish Stream' : 'Start Audio Streaming'}
            </span>
          </div>
        </div>

        {/* Real-time Audio Visualizer Component */}
        <AudioVisualizer isRecording={isRecording} audioLevel={audioLevel} />

        {/* Audio Telemetry Metrics Grid (Client Emitted vs Server Ingested) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-center space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-cyan-400" />
              Duration
            </span>
            <div className="text-lg font-mono font-bold text-white">
              {formatDuration(recordingDuration)}
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-center space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <Layers className="w-3 h-3 text-indigo-400" />
              Client Emitted
            </span>
            <div className="text-lg font-mono font-bold text-white">
              {audioChunks.length} <span className="text-xs text-slate-500 font-normal">chunks</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-center space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <Server className="w-3 h-3 text-emerald-400" />
              Server Ingested
            </span>
            <div className="text-lg font-mono font-bold text-emerald-400">
              {serverChunksReceived} <span className="text-xs text-slate-500 font-normal">acks</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-center space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <HardDrive className="w-3 h-3 text-purple-400" />
              Total Payload
            </span>
            <div className="text-lg font-mono font-bold text-white">
              {formatBytes(totalAudioBytes)}
            </div>
          </div>
        </div>
      </div>

      {/* Dual Stream Inspectors: Audio Chunks vs WebSocket Frames */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audio Chunks Stream Inspector */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Binary Audio Chunk Pipeline
              </h3>
            </div>
            {audioChunks.length > 0 && (
              <button
                onClick={clearAudioChunks}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Chunks</span>
              </button>
            )}
          </div>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-xs space-y-2 h-[340px] overflow-y-auto">
            {audioChunks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                <Mic className="w-8 h-8 text-slate-700" />
                <p>Click "Start Audio Streaming" to capture and stream chunks</p>
              </div>
            ) : (
              audioChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold">
                      #{chunk.chunkIndex}
                    </span>
                    <span className="text-slate-400 font-semibold">{chunk.timestamp}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-400">
                    <span className="text-cyan-300 font-bold">{formatBytes(chunk.sizeBytes)}</span>
                    <span className="text-emerald-400 font-semibold text-[10px]">Streamed → ws://</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WebSocket Event Stream Console */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                WebSocket Stream Console
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={sendPing}
                disabled={!isConnected}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>Ping ({latency ? `${latency}ms` : '--'})</span>
              </button>
              {eventLogs.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-xs space-y-2 h-[340px] overflow-y-auto">
            {eventLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                <Radio className="w-8 h-8 text-slate-700 animate-pulse" />
                <p>Waiting for WebSocket frames...</p>
              </div>
            ) : (
              eventLogs.map((log) => {
                const isSent = log.direction === 'sent';
                return (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border text-xs ${
                      isSent
                        ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300'
                        : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/5 text-[10px] text-slate-400">
                      <span className="font-bold flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSent ? 'bg-indigo-400' : 'bg-emerald-400'
                          }`}
                        />
                        {isSent ? 'CLIENT SENT' : 'SERVER RECEIVED'}
                      </span>
                      <span>{log.timestamp}</span>
                    </div>
                    <pre className="overflow-x-auto text-[10px]">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
