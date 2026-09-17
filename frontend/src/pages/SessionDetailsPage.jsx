import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Sparkles, 
  Radio, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  FileText, 
  Cpu, 
  Flame, 
  Lightbulb, 
  HelpCircle,
  Square,
  Zap,
  Database
} from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useAnalysisStore } from '../stores/analysisStore';

export default function SessionDetailsPage() {
  const { sessionId } = useParams();
  const { currentSession, fetchSessionById } = useSessionStore();
  const { finalTranscripts, loadPersistedTranscripts, transcriptsLoading } = useVoiceStore();
  const {
    isStreaming,
    streamStatus,
    summary,
    strengths,
    weaknesses,
    suggestions,
    isCompleted,
    savedAnalysis,
    isLoadingSaved,
    error: analysisError,
    streamEventsLog,
    startAnalysisStream,
    stopAnalysisStream,
    fetchSavedAnalysis,
    resetAnalysis,
  } = useAnalysisStore();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSessionById(sessionId);
      loadPersistedTranscripts(sessionId);
      fetchSavedAnalysis(sessionId);
    }

    return () => {
      resetAnalysis();
    };
  }, [sessionId, fetchSessionById, loadPersistedTranscripts, fetchSavedAnalysis, resetAnalysis]);

  const handleCopyTranscript = async () => {
    const text = finalTranscripts
      .map((t) => `${t.speaker === 'user' ? 'You' : t.speaker}: ${t.text}`)
      .join('\n\n');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = currentSession?.created_at
    ? new Date(currentSession.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const hasAnalysisData = Boolean(summary || strengths.length > 0 || savedAnalysis);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header & Navigation */}
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
                {currentSession?.title || 'Session Details'}
              </h2>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <Database className="w-3 h-3" />
                Phase 11: Saved AI Analysis
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formattedDate}
              </span>
              <span>•</span>
              <span>ID: {sessionId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end sm:self-auto">
          <Link
            to={`/sessions/${sessionId}/live`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Live Room</span>
          </Link>
        </div>
      </div>

      {/* Grid: Left Column (Transcripts) & Right Column (AI Analysis) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Session Transcript Card */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Full Transcripts ({finalTranscripts.length})
              </h3>
            </div>
            {finalTranscripts.length > 0 && (
              <button
                onClick={handleCopyTranscript}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="h-[460px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {transcriptsLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Cpu className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-xs">Loading recorded transcripts...</p>
              </div>
            ) : finalTranscripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 text-center p-6">
                <p className="text-xs">No transcripts recorded for this session yet.</p>
                <Link
                  to={`/sessions/${sessionId}/live`}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Join Live Room to speak & record
                </Link>
              </div>
            ) : (
              finalTranscripts.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-300 uppercase tracking-wide">
                      {t.speaker === 'user' ? 'You' : t.speaker}
                    </span>
                    {t.timestamp && (
                      <span className="font-mono">
                        {new Date(t.timestamp * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{t.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: AI Analysis (Saved / Streaming) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col space-y-5">
          {/* Header & Trigger Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  AI Speech Analysis
                  {savedAnalysis ? (
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Saved
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      SSE Stream
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {savedAnalysis
                    ? 'Retrieved from PostgreSQL database. You can review or re-run analysis anytime.'
                    : 'Streams progressive AI insights over HTTP using Server-Sent Events'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isStreaming ? (
                <button
                  onClick={stopAnalysisStream}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Stream</span>
                </button>
              ) : (
                <button
                  onClick={() => startAnalysisStream(sessionId)}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{hasAnalysisData ? 'Re-run Analysis (SSE)' : 'Start Analysis (SSE)'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Status / Error Notifications */}
          {analysisError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* Active Streaming Status Ticker */}
          {isStreaming && (
            <div className="p-2.5 rounded-xl bg-violet-950/40 border border-violet-500/30 flex items-center justify-between text-xs text-violet-200">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                <span className="font-semibold text-violet-300">SSE EventSource Active:</span>
                <span className="italic">{streamStatus}</span>
              </div>
              <span className="text-[10px] font-mono text-violet-400 uppercase tracking-wider">
                Streaming HTTP
              </span>
            </div>
          )}

          {/* Saved in Database Info Banner */}
          {savedAnalysis && !isStreaming && (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/25 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Saved in Database:</strong> Analyzed on{' '}
                  {new Date(savedAnalysis.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Persistent
              </span>
            </div>
          )}

          {/* Loading saved analysis indicator */}
          {isLoadingSaved && !isStreaming && (
            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center space-x-2 text-xs text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              <span>Checking database for saved AI analysis...</span>
            </div>
          )}

          {/* Analysis Content Display */}
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[460px] pr-1 custom-scrollbar">
            {!isStreaming && !hasAnalysisData ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-slate-500 space-y-3 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-300">Ready to Stream AI Analysis</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Click <strong>"Start Analysis (SSE)"</strong> above. The backend will stream multi-stage analysis events progressively over time and automatically save the results.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Summary Section (Progressive chunk typing / Stored text) */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <FileText className="w-3.5 h-3.5" />
                      Executive Summary
                    </span>
                    {isStreaming && !isCompleted && (
                      <span className="text-[10px] font-normal text-cyan-300/80 animate-pulse">
                        streaming chunks...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-normal min-h-[40px]">
                    {summary || (
                      <span className="text-slate-500 italic">Waiting for summary chunks...</span>
                    )}
                    {isStreaming && <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />}
                  </p>
                </div>

                {/* 2. Key Strengths Section */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      Key Strengths
                    </span>
                    <span className="text-[10px] font-mono text-emerald-500">{strengths.length} noted</span>
                  </div>
                  {strengths.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Awaiting strength events...</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 3. Areas for Improvement Section */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Areas for Improvement
                    </span>
                    <span className="text-[10px] font-mono text-amber-500">{weaknesses.length} noted</span>
                  </div>
                  {weaknesses.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Awaiting improvement events...</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {weaknesses.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 4. Actionable Suggestions Section */}
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Actionable Recommendations
                    </span>
                    <span className="text-[10px] font-mono text-indigo-500">{suggestions.length} noted</span>
                  </div>
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Awaiting suggestion events...</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {suggestions.map((sug, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* SSE Live Events Audit Feed (Only when streaming or events logged) */}
                {streamEventsLog.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      SSE EventSource Telemetry Log:
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {streamEventsLog.map((log) => (
                        <div key={log.id} className="flex items-center gap-2 text-slate-400 text-[10px]">
                          <span className="text-slate-600">{log.timestamp}</span>
                          <span className="text-violet-400 uppercase font-semibold">[{log.type}]</span>
                          <span className="text-slate-300 truncate">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
