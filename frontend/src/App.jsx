import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import LiveSessionPage from './pages/LiveSessionPage';
import SessionDetailsPage from './pages/SessionDetailsPage';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar />

        <main className="flex-1 w-full">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <SessionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/:sessionId"
              element={
                <ProtectedRoute>
                  <SessionDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/:sessionId/live"
              element={
                <ProtectedRoute>
                  <LiveSessionPage />
                </ProtectedRoute>
              }
            />
            {/* Default redirect to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800/60 bg-slate-950/40 py-4 mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div>VoxAI Intelligence Studio • Enterprise Real-Time Speech Processing & Generative Insights</div>
            <div className="font-mono text-indigo-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Low-Latency Streaming Architecture
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
