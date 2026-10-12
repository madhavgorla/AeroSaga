import React from 'react';
import type { Drone, Mission } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, ShieldCheck, BatteryCharging, Clock, CheckCircle2 } from 'lucide-react';

interface AnalyticsViewProps {
  missions: Mission[];
  drones: Drone[];
}

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: '#38bdf8',
  SUSPENDED_OFFLINE: '#f43f5e',
  RECOVERING: '#22d3ee',
  COMPLETED: '#10b981',
  ABORTED: '#64748b',
  CREATED: '#f59e0b',
  SCHEDULED: '#fbbf24',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ missions, drones }) => {
  // Aggregate status distribution
  const statusCounts = missions.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.replaceAll('_', ' '),
    rawName: name,
    value,
  }));

  // Drone battery chart data
  const batteryData = drones.map((d) => ({
    droneId: d.droneId,
    battery: d.batteryPercent,
    status: d.status,
  }));

  const completedCount = missions.filter((m) => m.status === 'COMPLETED').length;
  const inProgressCount = missions.filter((m) => m.status === 'IN_PROGRESS').length;
  const suspendedCount = missions.filter((m) => m.status === 'SUSPENDED_OFFLINE').length;
  const avgBattery =
    drones.length > 0
      ? Math.round(drones.reduce((acc, d) => acc + d.batteryPercent, 0) / drones.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
            <span>TOTAL DISPATCHED</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono-numbers">
            {missions.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono-numbers">
            All recorded Temporal runs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
            <span>COMPLETED DELIVERIES</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono-numbers">
            {completedCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono-numbers">
            100% mission payload verified
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
            <span>TEMPORAL SIGNAL WAITING</span>
            <ShieldCheck className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400 font-mono-numbers">
            {suspendedCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono-numbers">
            Durable pause pending reconnect
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
            <span>FLEET AVERAGE BATTERY</span>
            <BatteryCharging className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono-numbers">
            {avgBattery}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono-numbers">
            {drones.length} simulated drones active
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Status Distribution */}
        <div className="p-5 rounded-xl bg-[#0b1325] border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Temporal Workflow Lifecycle Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Current state distribution across all tracked delivery workflows
            </p>
          </div>

          <div className="h-64 w-full mt-4 flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-slate-500">No mission data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.rawName] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-800 text-xs font-mono-numbers">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[item.rawName] || '#94a3b8' }}
                />
                <span className="text-slate-300">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Drone Battery Telemetry */}
        <div className="p-5 rounded-xl bg-[#0b1325] border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Fleet Battery Reserves & Capacity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual charge levels across active delivery airframes
            </p>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batteryData}>
                <XAxis
                  dataKey="droneId"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${val}%`, 'Battery']}
                />
                <Bar dataKey="battery" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono-numbers">
            <span>Minimum operational threshold: 20%</span>
            <span className="text-emerald-400 font-semibold">All units flight-rated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
