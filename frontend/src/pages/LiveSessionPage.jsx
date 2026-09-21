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
  CheckCircle2,
  Sparkles,
  Terminal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { useVoiceStore } from '../stores/voiceStore';
import AudioVisualizer from '../components/AudioVisualizer';
import TranscriptPanel from '../components/TranscriptPanel';

export default function LiveSessionPage() {
  const { sessionId } = useParams();
  const { currentSession, fetchSessionById } = useSessionStore();
  const { 
    // WebSocket & Streaming Connection State
    connectionStatus, 
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectSession,
    latency, 
    eventLogs, 
    error: wsError, 
    connectSession, 
    disconnectSession, 
    sendPing, 
    sendTestMessage,
    clearLogs,
    resetSessionState,

    // Audio & Recording Status
    recordingStatus,
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

    // Audio Streaming state
    isStreamingAudio,
    serverChunksReceived,
    serverBytesReceived
  } = useVoiceStore();

  const [showDeveloperConsole, setShowDeveloperConsole] = useState(false);

  // Fetch session details and initiate WebSocket connection
  useEffect(() => {
    if (sessionId) {
      fetchSessionById(sessionId);
      connectSession(sessionId);
    }

    // Teardown: Stop microphone tracks and close WebSocket on unmount
    return () => {
      resetSessionState();
    };
  }, [sessionId, fetchSessionById, connectSession, resetSessionState]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isReconnecting = connectionStatus === 'reconnecting';
  const isError = connectionStatus === 'error';

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
              ) : isReconnecting ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
                  <Activity className="w-3 h-3 text-amber-400 animate-spin" />
                  RECONNECTING ({reconnectAttempts}/{maxReconnectAttempts})
                </span>
              ) : isConnecting ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  CONNECTING
                </span>
              ) : isError ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  CONNECTION ERROR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  DISCONNECTED
                </span>
              )}

              {/* Recording Lifecycle Status Badge */}
              {recordingStatus === 'recording' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  LIVE STREAMING
                </span>
              ) : recordingStatus === 'starting' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  INITIALIZING MIC...
                </span>
              ) : recordingStatus === 'stopping' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  FINALIZING...
                </span>
              ) : recordingStatus === 'error' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  MIC ERROR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                  STANDBY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Voice Room: {sessionId?.slice(0, 8)}... • Real-Time Voice Pipeline
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <Link
            to={`/sessions/${sessionId}`}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/20 text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Generate AI Insights</span>
          </Link>

          {isConnected ? (
            <button
              onClick={disconnectSession}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            >
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Disconnect</span>
            </button>
          ) : isReconnecting || isError ? (
            <button
              onClick={reconnectSession}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all"
            >
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>Retry Connection</span>
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

      {/* Errors Banner & Permissions Guidance */}
      {(wsError || recordingError) && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{recordingError || wsError}</span>
          </div>
          {recordingError && recordingError.toLowerCase().includes('permission') && (
            <p className="text-[11px] text-rose-400/90 pl-6">
              💡 <strong>How to fix:</strong> Click the lock or microphone icon in your browser address bar (URL bar), set Microphone to <strong>"Allow"</strong>, and click <strong>Retry Connection</strong>.
            </p>
          )}
        </div>
      )}

      {/* MediaRecorder Audio Studio Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
              AI Voice Studio • Real-Time STT
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Real-Time Microphone Audio & Speech Transcription
            </h3>
            <p className="text-xs text-slate-400 max-w-lg">
              High-accuracy live speech recognition with sub-second turn detection. Click the microphone button to start speaking.
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

        {/* Audio Telemetry Metrics Grid */}
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
              Audio Ingested
            </span>
            <div className="text-lg font-mono font-bold text-white">
              {audioChunks.length} <span className="text-xs text-slate-500 font-normal">chunks</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-center space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <Server className="w-3 h-3 text-emerald-400" />
              Stream Health
            </span>
            <div className="text-lg font-mono font-bold text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{syncRatio}% Synced</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-center space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <HardDrive className="w-3 h-3 text-purple-400" />
              Total Transferred
            </span>
            <div className="text-lg font-mono font-bold text-white">
              {formatBytes(totalAudioBytes)}
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Speech-to-Text Transcription Panel */}
      <TranscriptPanel sessionId={sessionId} />

      {/* Collapsible Technical Telemetry & Protocol Console */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowDeveloperConsole(!showDeveloperConsole)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 text-xs text-slate-400 hover:text-slate-200 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-md bg-slate-800 text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-300">Live Network Telemetry & Protocol Inspector</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {showDeveloperConsole ? 'Active Inspector' : 'Optional Telemetry'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 group-hover:text-slate-300">
            <span>{showDeveloperConsole ? 'Hide Console' : 'Show Protocol Logs'}</span>
            {showDeveloperConsole ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showDeveloperConsole && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 animate-fadeIn">
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

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-xs space-y-2 h-[320px] overflow-y-auto custom-scrollbar">
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

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-xs space-y-2 h-[320px] overflow-y-auto custom-scrollbar">
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
        )}
      </div>
    </div>
  );
}
