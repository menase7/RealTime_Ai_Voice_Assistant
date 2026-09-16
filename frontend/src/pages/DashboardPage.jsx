import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mic, 
  Plus, 
  Clock, 
  Sparkles, 
  Calendar, 
  Layers, 
  ShieldCheck, 
  User, 
  Activity,
  ArrowRight,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSessionStore } from '../stores/sessionStore';
import { checkBackendHealth } from '../services/api';
import CreateSessionModal from '../components/CreateSessionModal';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { sessions, fetchSessions } = useSessionStore();
  const [health, setHealth] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchSessions();
    checkBackendHealth().then((res) => {
      if (res.success) setHealth(res.data);
    });
  }, [fetchSessions]);

  const formattedDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Recent';

  const recentSessions = sessions.slice(0, 4);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1 rounded-full bg-amber-400 animate-pulse"></span>
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            Completed
          </span>
        );
      case 'created':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
            Created
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authenticated Session Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, <span className="text-indigo-400">{user?.email?.split('@')[0] || 'User'}</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Create real-time voice sessions, test low-latency WebSocket communication, and prepare for microphone audio streaming.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Voice Session</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Section 17: Number of sessions) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Voice Sessions</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{sessions.length}</div>
          <p className="text-[11px] text-slate-500">Managed via PostgreSQL & Zustand</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Audio Streamed</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">0:00</div>
          <p className="text-[11px] text-slate-500">WebSocket MediaRecorder streams</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">AI Analyses Generated</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">0</div>
          <p className="text-[11px] text-slate-500">Gemini SSE stream analyses</p>
        </div>
      </div>

      {/* Recent Sessions Section (Section 17: Recent sessions) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Sessions</h3>
            <p className="text-xs text-slate-400">Open a live WebSocket session or review history</p>
          </div>
          {sessions.length > 0 && (
            <Link
              to="/sessions"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
            >
              View all ({sessions.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-500">
              <Mic className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-300">No voice sessions yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first voice session to test real-time WebSocket communication.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Session</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3 hover:border-slate-700 transition-colors shadow-md flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm text-white truncate">{s.title}</h4>
                    {getStatusBadge(s.status)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>
                      {new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">ID: {s.id.slice(0, 8)}</span>
                  <Link
                    to={`/sessions/${s.id}/live`}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-[1.02]"
                  >
                    <Radio className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Join Live</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Info & Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Authenticated User Profile
            </h4>
            <span className="text-xs font-mono text-emerald-400">JWT Valid</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
              <span>User ID:</span>
              <span className="text-white select-all">{user?.id || '--'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
              <span>Email:</span>
              <span className="text-indigo-300">{user?.email || '--'}</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-400">
              <span>Member Since:</span>
              <span className="text-white">{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Roadmap Progress
            </h4>
            <span className="text-xs font-semibold text-indigo-400">Step 4 of 12</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Phase 1: Project Setup (Completed)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Phase 2: Authentication (Completed)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Phase 3: Session Management (Completed)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Phase 4: Basic WebSocket Lifecycle (Completed)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
              <ArrowRight className="w-4 h-4" />
              <span>Phase 5: MediaRecorder API (Next)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <CreateSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => fetchSessions()}
      />
    </div>
  );
}
