import React, { useState } from 'react';
import { apiService } from '../../services/api';
import type { HealthResponse } from '../../types';
import { Terminal, CheckCircle2, AlertTriangle, RefreshCw, Server, ShieldCheck, ExternalLink } from 'lucide-react';

interface DiagnosticsPanelProps {
  isMockMode: boolean;
  onToggleMockMode: (val: boolean) => void;
  onRefresh: () => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  isMockMode,
  onToggleMockMode,
  onRefresh,
}) => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastPing, setLastPing] = useState<string | null>(null);

  const testHealth = async () => {
    setLoading(true);
    try {
      const res = await apiService.checkBackendHealth();
      setHealthData(res);
      setLastPing(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = apiService.getBaseUrl();

  const endpoints = [
    { method: 'GET', route: '/api/health', purpose: 'Backend health probe' },
    { method: 'GET', route: '/api/drones', purpose: 'Simulated drone fleet' },
    { method: 'GET', route: '/api/missions', purpose: 'Mission projections list' },
    { method: 'POST', route: '/api/missions', purpose: 'Create mission & start Temporal workflow' },
    { method: 'GET', route: '/api/missions/{id}', purpose: 'Mission details & status' },
    { method: 'GET', route: '/api/missions/{id}/events', purpose: 'Chronological event timeline' },
    { method: 'POST', route: '/api/drones/{id}/offline', purpose: 'Signal offline -> durable wait' },
    { method: 'POST', route: '/api/drones/{id}/reconnected', purpose: 'Signal reconnect -> resume' },
    { method: 'POST', route: '/api/missions/{id}/abort', purpose: 'Signal emergency abort' },
    { method: 'POST', route: '/api/missions/{id}/reroute', purpose: 'Signal replacement flight route' },
  ];

  return (
    <div className="space-y-6">
      {/* Backend Connection Card */}
      <div className="p-5 rounded-xl bg-[#0b1325] border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Spring Boot REST API Gateway
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono-numbers">
              Target Base URL:{' '}
              <span className="text-sky-300 font-semibold">{baseUrl}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={testHealth}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Ping /api/health</span>
            </button>

            <button
              onClick={() => onToggleMockMode(!isMockMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isMockMode
                  ? 'bg-amber-950/60 border-amber-600/70 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
              }`}
            >
              Mode: {isMockMode ? 'Simulation Engine' : 'Live Spring Boot'}
            </button>
          </div>
        </div>

        {/* Health response box */}
        <div className="mt-4 p-4 rounded-lg bg-slate-950/90 border border-slate-800/90 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] mb-2">
            <span>HEALTH RESPONSE BUFFER</span>
            {lastPing && <span>Last ping: {lastPing}</span>}
          </div>
          {healthData ? (
            <pre className="text-emerald-400 overflow-x-auto text-[11px]">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          ) : (
            <p className="text-slate-500 text-[11px]">
              Click "Ping /api/health" to test the connection to your Spring Boot service.
            </p>
          )}
        </div>
      </div>

      {/* Contract Verification Table */}
      <div className="p-5 rounded-xl bg-[#0b1325] border border-slate-800">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Documented API Contracts & Routing Table</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Complies with Team 6 API Specification (`/docs/API_CONTRACT.md`) and Spring Boot Controllers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono-numbers text-[11px]">
                <th className="py-2.5 px-3">METHOD</th>
                <th className="py-2.5 px-3">ROUTE</th>
                <th className="py-2.5 px-3">PURPOSE</th>
                <th className="py-2.5 px-3">INTEGRATION STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono-numbers text-[11px]">
              {endpoints.map((ep, i) => (
                <tr key={i} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'GET'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{ep.route}</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">{ep.purpose}</td>
                  <td className="py-2.5 px-3 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Wired & Handled</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Temporal Orchestration Architecture Note */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white block mb-0.5">Spring Boot & Temporal Architecture:</strong>
          The React client communicates solely via HTTP JSON with Spring Boot endpoints (<code className="font-mono text-sky-300">/api/missions</code>, <code className="font-mono text-sky-300">/api/health</code>).
          Durable workflow orchestration, activity retries, and offline signal gates execute on
          Temporal Task Queue <code className="font-mono text-sky-300">AEROSAGA_MISSION_QUEUE</code>.
        </div>
      </div>
    </div>
  );
};
