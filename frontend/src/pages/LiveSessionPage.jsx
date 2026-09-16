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
  RefreshCw, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { useVoiceStore } from '../stores/voiceStore';

export default function LiveSessionPage() {
  const { sessionId } = useParams();
  const { currentSession, fetchSessionById } = useSessionStore();
  const { 
    connectionStatus, 
    latency, 
    eventLogs, 
    error, 
    connectSession, 
    disconnectSession, 
    sendPing, 
    sendTestMessage,
    clearLogs 
  } = useVoiceStore();

  const [inputMessage, setInputMessage] = useState('');

  // 1. Fetch session details and initiate WebSocket connection
  useEffect(() => {
    if (sessionId) {
      fetchSessionById(sessionId);
      connectSession(sessionId);
    }

    // Teardown: Close WebSocket connection on component unmount
    return () => {
      disconnectSession();
    };
  }, [sessionId, fetchSessionById, connectSession, disconnectSession]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendTestMessage(inputMessage);
    setInputMessage('');
  };

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/sessions"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {currentSession?.title || 'Live Voice Session'}
              </h2>
              {/* Connection Status Badge */}
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
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {sessionId} • WebSocket Protocol: ws://
            </p>
          </div>
        </div>

        {/* Manual Connect / Disconnect Buttons */}
        <div className="flex items-center space-x-3">
          {isConnected ? (
            <button
              onClick={disconnectSession}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Disconnect Socket</span>
            </button>
          ) : (
            <button
              onClick={() => connectSession(sessionId)}
              disabled={isConnecting}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Socket'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Socket Status</span>
            <div className="text-lg font-bold text-white uppercase tracking-wider">
              {connectionStatus}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Round-Trip Latency</span>
            <div className="text-lg font-bold text-white font-mono">
              {latency !== null ? `${latency} ms` : '--'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Buffered Events</span>
            <div className="text-lg font-bold text-white font-mono">
              {eventLogs.length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Real-time Event Testing Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls & Test Message Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              WebSocket Event Sender
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify bidirectional frame transmission across the open WebSocket connection.
            </p>

            {/* Quick Ping Trigger */}
            <div className="pt-2">
              <button
                type="button"
                onClick={sendPing}
                disabled={!isConnected}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Send Ping (Measure RTT)</span>
              </button>
            </div>

            {/* Send Custom Message Form */}
            <form onSubmit={handleSendMessage} className="space-y-3 pt-2">
              <label className="text-xs font-medium text-slate-300 block">Custom Message</label>
              <textarea
                rows={3}
                placeholder="Enter test payload..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={!isConnected}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50 resize-none font-mono"
              />

              <button
                type="submit"
                disabled={!isConnected || !inputMessage.trim()}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Frame</span>
              </button>
            </form>
          </div>

          {/* Phase 5 Audio Streaming Placeholder */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5 space-y-3 opacity-70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-slate-500" />
                Audio Streaming Preview
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                Phase 5 & 6
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Browser microphone capture via MediaRecorder API and binary audio chunk streaming will connect to this WebSocket pipeline in the upcoming phases.
            </p>
          </div>
        </div>

        {/* Live Bidirectional Event Console */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Bidirectional Event Stream</h3>
            </div>
            <button
              onClick={clearLogs}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Console</span>
            </button>
          </div>

          {/* Console Window */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 font-mono text-xs space-y-2.5 h-[420px] overflow-y-auto">
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
                    className={`p-2.5 rounded-lg border text-xs leading-relaxed transition-all ${
                      isSent
                        ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300'
                        : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/5 text-[10px] text-slate-400">
                      <span className="font-bold flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSent ? 'bg-indigo-400' : 'bg-emerald-400'
                          }`}
                        />
                        {isSent ? 'CLIENT SENT' : 'SERVER RECEIVED'}
                      </span>
                      <span>{log.timestamp}</span>
                    </div>
                    <pre className="overflow-x-auto text-[11px]">
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
