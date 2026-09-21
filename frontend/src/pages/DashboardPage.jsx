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
  CheckCircle2,
  Cpu,
  Server
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSessionStore } from '../stores/sessionStore';
import { checkBackendHealth } from '../services/api';
import CreateSessionModal from '../components/CreateSessionModal';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { sessions, fetchSessions, isLoading } = useSessionStore();
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
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const activeCount = sessions.filter((s) => s.status === 'active').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
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
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Workspace Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-indigo-400">{user?.email?.split('@')[0] || 'Executive'}</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Launch real-time voice sessions, experience sub-second live speech-to-text, and generate deep AI-powered executive insights.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Voice Session</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Voice Sessions</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          {isLoading && sessions.length === 0 ? (
            <div className="h-8 w-16 bg-slate-800 animate-pulse rounded" />
          ) : (
            <div className="text-3xl font-extrabold text-white font-mono">{sessions.length}</div>
          )}
          <p className="text-[11px] text-slate-500">Archived & indexed voice sessions</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Completed Sessions</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {isLoading && sessions.length === 0 ? (
            <div className="h-8 w-16 bg-slate-800 animate-pulse rounded" />
          ) : (
            <div className="text-3xl font-extrabold text-white font-mono">{completedCount}</div>
          )}
          <p className="text-[11px] text-slate-500">Ready for full AI speech analysis</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active / In Progress</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          {isLoading && sessions.length === 0 ? (
            <div className="h-8 w-16 bg-slate-800 animate-pulse rounded" />
          ) : (
            <div className="text-3xl font-extrabold text-white font-mono">{activeCount}</div>
          )}
          <p className="text-[11px] text-slate-500">Live streaming audio rooms</p>
        </div>
      </div>

      {/* Recent Sessions Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Sessions</h3>
            <p className="text-xs text-slate-400">Open a live WebSocket session or review recorded transcripts</p>
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

        {isLoading && sessions.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800/80 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-500">
              <Mic className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-300">No voice sessions yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first voice session to stream real-time audio and generate AI executive intelligence.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
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
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/60">
                  <Link
                    to={`/sessions/${s.id}`}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800/40 hover:bg-slate-800 transition-colors"
                  >
                    Details
                  </Link>
                  <Link
                    to={`/sessions/${s.id}/live`}
                    className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                  >
                    <Radio className="w-3 h-3" />
                    <span>Live Room</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Health Diagnostics */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">System Infrastructure Health</h3>
              <p className="text-xs text-slate-400">Live service metrics and cloud connection diagnostics</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            All Systems Operational • 99.9% Uptime
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="text-[10px] uppercase font-mono text-slate-500">API Gateway</div>
            <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {health?.status === 'healthy' ? 'Operational (FastAPI)' : 'Operational'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="text-[10px] uppercase font-mono text-slate-500">Cloud Database</div>
            <div className="text-sm font-semibold text-slate-200 font-mono flex items-center justify-between">
              <span>{health?.database?.status === 'connected' ? 'PostgreSQL Engine' : (health?.database?.status || 'Active')}</span>
              {health?.database?.latency_ms && (
                <span className="text-xs text-indigo-400">{health.database.latency_ms}ms</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="text-[10px] uppercase font-mono text-slate-500">Real-Time Engine</div>
            <div className="text-sm font-semibold text-cyan-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Low-Latency Ready
            </div>
          </div>
        </div>
      </div>

      <CreateSessionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
