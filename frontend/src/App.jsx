import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Monitor, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Layers, 
  Radio, 
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { checkBackendHealth } from './services/api';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const result = await checkBackendHealth();
    setPingLatency(result.latency);
    if (result.success) {
      setHealthData(result.data);
      setError(null);
    } else {
      setError(result.error);
      setHealthData(null);
    }
    setLastChecked(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const isBackendOnline = healthData && !error;
  const isDbOnline = healthData?.database?.status === 'connected';

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                Real-Time AI Voice Assistant
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Phase 1
                </span>
              </h1>
              <p className="text-xs text-slate-400">Full-Stack Core Architecture & Health Verification</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{loading ? 'Pinging...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Phase 1 Scaffolding Ready
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                System Infrastructure Online
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Frontend (React 18 + Vite), Backend (FastAPI + Async Python), and Database (PostgreSQL) container orchestration initialized via Docker Compose.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Round-trip Health Check</span>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-lg font-mono font-bold text-white">
                  {pingLatency !== null ? `${pingLatency} ms` : '--'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Last polled: {lastChecked || 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Core Services Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Card */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Frontend Client</h3>
                <p className="text-xs text-slate-400 mt-0.5">React 18 • Vite 5 • Tailwind CSS</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800/60 mt-4 text-xs font-mono text-slate-400 flex justify-between">
              <span>Port: 5173</span>
              <span className="text-emerald-400">Hot Reload Active</span>
            </div>
          </div>

          {/* Backend Card */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Server className="w-5 h-5" />
                </div>
                {isBackendOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Healthy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Offline
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">Backend API</h3>
                <p className="text-xs text-slate-400 mt-0.5">FastAPI • Uvicorn • Python 3.11+</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800/60 mt-4 text-xs font-mono text-slate-400 flex justify-between">
              <span>Port: 8000</span>
              <span>Uptime: {healthData?.uptime_seconds ? `${healthData.uptime_seconds}s` : '--'}</span>
            </div>
          </div>

          {/* Database Card */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Database className="w-5 h-5" />
                </div>
                {isDbOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Degraded
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">Database</h3>
                <p className="text-xs text-slate-400 mt-0.5">PostgreSQL 16 • AsyncPG Driver</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800/60 mt-4 text-xs font-mono text-slate-400 flex justify-between">
              <span>Port: 5432</span>
              <span>Ping: {healthData?.database?.latency_ms ? `${healthData.database.latency_ms}ms` : '--'}</span>
            </div>
          </div>
        </div>

        {/* Live Diagnostics & System Health Payload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* JSON Telemetry viewer */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Backend Telemetry Endpoint (/api/health)
              </h4>
              <span className="text-[11px] font-mono text-slate-400">GET http://localhost:8000/api/health</span>
            </div>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-indigo-300 border border-slate-800/80 overflow-x-auto min-h-[160px] flex items-center">
              {loading && !healthData ? (
                <div className="text-slate-500 animate-pulse">Querying backend telemetry...</div>
              ) : error ? (
                <div className="text-rose-400 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Error contacting backend
                  </div>
                  <p className="text-xs text-slate-400">{error}</p>
                </div>
              ) : (
                <pre className="text-emerald-400">{JSON.stringify(healthData, null, 2)}</pre>
              )}
            </div>
          </div>

          {/* Phase Roadmap Progress Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Phase Roadmap Tracker
              </h4>
              <span className="text-xs font-semibold text-indigo-400">Step 1 of 12</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Phase 1: Project Setup (Completed)</div>
                  <div className="text-[11px] text-slate-400">Vite, FastAPI, PostgreSQL, Docker Compose, async health ping.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 opacity-80">
                <ArrowRight className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-300">Phase 2: Authentication (Next)</div>
                  <div className="text-[11px] text-slate-400">User model, JWT tokens, bcrypt hash, auth store, protected routes.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/30 border border-slate-800/40 opacity-50">
                <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-400">Phases 3 — 12: Real-time Voice & Streaming</div>
                  <div className="text-[11px] text-slate-500">WebSocket, MediaRecorder, AssemblyAI, SSE, Gemini Streaming.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/40 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>Real-Time AI Voice Assistant • Built with React 18, FastAPI, and PostgreSQL</div>
          <div className="font-mono text-indigo-400">Docker Compose: [frontend, backend, postgres]</div>
        </div>
      </footer>
    </div>
  );
}
