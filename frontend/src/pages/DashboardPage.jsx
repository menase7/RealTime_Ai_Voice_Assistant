import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Plus, 
  Clock, 
  Sparkles, 
  Calendar, 
  KeyRound, 
  Layers, 
  ShieldCheck, 
  User, 
  Activity,
  ArrowRight,
  Database
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { checkBackendHealth } from '../services/api';

export default function DashboardPage() {
  const { user, token } = useAuthStore();
  const [health, setHealth] = useState(null);
  const [showSessionNotice, setShowSessionNotice] = useState(false);

  useEffect(() => {
    checkBackendHealth().then((res) => {
      if (res.success) setHealth(res.data);
    });
  }, []);

  const formattedDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Recent';

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
              Your account is verified. Create real-time voice sessions, capture live transcripts with AssemblyAI, and generate progressive AI feedback with Gemini.
            </p>
          </div>

          <button
            onClick={() => setShowSessionNotice(true)}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Voice Session</span>
          </button>
        </div>
      </div>

      {showSessionNotice && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Session creation and management will be activated in <strong>Phase 3: Session Management</strong>.</span>
          </div>
          <button 
            onClick={() => setShowSessionNotice(false)} 
            className="text-indigo-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row (Section 17: Number of sessions) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Voice Sessions</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">0</div>
          <p className="text-[11px] text-slate-500">Ready for session storage in Phase 3</p>
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
            <p className="text-xs text-slate-400">Your recorded audio sessions and AI summaries</p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-500">
            <Mic className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-slate-300">No sessions yet</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once Phase 3 is implemented, you will be able to create new voice sessions, start microphone recording, and review transcripts.
          </p>
        </div>
      </div>

      {/* Active User Credentials & System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity Card */}
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
              <span>Created At:</span>
              <span className="text-white">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Phase Progress Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Roadmap Progress
            </h4>
            <span className="text-xs font-semibold text-indigo-400">Step 2 of 12</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Phase 1: Project Setup (Completed)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Phase 2: Authentication & Protected Routes (Completed)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
              <ArrowRight className="w-4 h-4" />
              <span>Phase 3: Session Management (Next)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
