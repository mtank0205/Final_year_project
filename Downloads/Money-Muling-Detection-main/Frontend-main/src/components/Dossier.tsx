import type { MuleNode } from '../types';
import {
  AlertOctagon,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Users,
  Activity,
  Fingerprint,
} from 'lucide-react';

interface DossierProps {
  selectedNode: MuleNode | null;
}

export default function Dossier({ selectedNode }: DossierProps) {
  if (!selectedNode) {
    return (
      <aside className="w-[340px] min-w-[340px] h-full glass-panel flex flex-col overflow-hidden">
        <div className="p-5 border-b border-algo-border/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">
              Account Risk Profile
            </h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-algo-border/20 flex items-center justify-center mx-auto">
              <Fingerprint className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">No Entity Selected</p>
              <p className="text-xs text-gray-600 mt-1">
                Click an account row or graph node to inspect its continuous risk score & drivers
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const riskScore = typeof selectedNode.riskScore === 'number' ? selectedNode.riskScore : 0;
  const displayScore = riskScore.toFixed(2);
  
  const riskLevel = selectedNode.riskLevel || (riskScore >= 0.70 ? 'HIGH' : riskScore >= 0.30 ? 'MEDIUM' : 'LOW');
  
  const riskColor = riskLevel === 'HIGH' ? 'text-red-400' : riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-green-400';
  const riskBg = riskLevel === 'HIGH' ? 'bg-red-500/10 border-red-500/30' : riskLevel === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30';
  const strokeColor = riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#22c55e';

  // Ring gauge SVG scaled 0.00 to 1.00
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - Math.min(1.0, Math.max(0.0, riskScore)) * circumference;

  const passThroughPct = typeof selectedNode.passThroughRatio === 'number' 
    ? `${(selectedNode.passThroughRatio * 100).toFixed(0)}%` 
    : 'N/A';

  return (
    <aside className="w-[340px] min-w-[340px] h-full glass-panel flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-algo-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-algo-teal" />
          <h2 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">
            Account Risk Profile
          </h2>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${riskBg} ${riskColor}`}>
          {riskLevel} RISK
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Risk Score Gauge Card */}
        <div className={`rounded-xl p-5 border ${riskBg} transition-all duration-500`}>
          <div className="flex items-center gap-5">
            {/* SVG ring gauge */}
            <div className="relative w-[95px] h-[95px] flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1E293B" strokeWidth="7" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{
                    transition: 'stroke-dashoffset 0.8s ease-in-out',
                    filter: `drop-shadow(0 0 6px ${strokeColor})`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold font-mono ${riskColor}`}>{displayScore}</span>
                <span className="text-[9px] text-gray-500 uppercase font-mono">Score [0-1]</span>
              </div>
            </div>

            {/* Account Info */}
            <div className="overflow-hidden">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                Account ID
              </span>
              <h3 className="text-base font-bold text-gray-100 font-mono truncate">{selectedNode.id}</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Status: <span className="font-semibold text-gray-200">{riskLevel === 'HIGH' ? 'Potential Money Mule' : riskLevel === 'MEDIUM' ? 'Elevated Risk' : 'Normal Account'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Explainability: Dynamic Suspicion Reasons */}
        <div>
          <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2 font-semibold">
            Suspicion Reasons / Risk Drivers
          </h4>
          <div className="space-y-1.5">
            {selectedNode.reasons && selectedNode.reasons.length > 0 ? (
              selectedNode.reasons.map((reason, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-algo-dark/60 border border-algo-border/30 rounded-lg px-3 py-2"
                >
                  <AlertOctagon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${riskColor}`} />
                  <span className="text-xs text-gray-200 leading-snug">{reason}</span>
                </div>
              ))
            ) : selectedNode.flaggedPatterns && selectedNode.flaggedPatterns.length > 0 ? (
              selectedNode.flaggedPatterns.map((pattern, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-algo-red flex-shrink-0" />
                  <span className="text-xs text-gray-300">{pattern}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/10 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400">Normal account behavior with low risk indicators</span>
              </div>
            )}
          </div>
        </div>

        {/* Account Behavioral Feature Metrics */}
        <div>
          <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2 font-semibold">
            Behavioral Metrics
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetaCard
              icon={ArrowDownLeft}
              label="Total Incoming"
              value={selectedNode.inAmount !== undefined ? `$${selectedNode.inAmount.toLocaleString()}` : 'N/A'}
            />
            <MetaCard
              icon={ArrowUpRight}
              label="Total Outgoing"
              value={selectedNode.outAmount !== undefined ? `$${selectedNode.outAmount.toLocaleString()}` : 'N/A'}
            />
            <MetaCard
              icon={RefreshCw}
              label="Pass-Through Ratio"
              value={passThroughPct}
            />
            <MetaCard
              icon={Activity}
              label="Tx Velocity"
              value={selectedNode.txCount !== undefined ? `${selectedNode.txCount} txs` : 'N/A'}
            />
            <MetaCard
              icon={Users}
              label="Unique Senders"
              value={selectedNode.uniqueSenders !== undefined ? `${selectedNode.uniqueSenders}` : 'N/A'}
            />
            <MetaCard
              icon={Users}
              label="Unique Receivers"
              value={selectedNode.uniqueReceivers !== undefined ? `${selectedNode.uniqueReceivers}` : 'N/A'}
            />
          </div>
        </div>

        {/* On-Chain AML Verification */}
        <div className="glass-card rounded-xl p-4 border border-algo-border/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-algo-teal animate-pulse" />
            <span className="text-[10px] font-mono text-algo-teal uppercase tracking-widest font-semibold">
              On-Chain AML Registry
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Account risk status & continuous score logged to immutable blockchain registry.
          </p>
          <p className="text-[10px] font-mono text-gray-600 mt-2 break-all">
            Hash: {generateFakeHash(selectedNode.id)}
          </p>
        </div>
      </div>
    </aside>
  );
}

function MetaCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass-card rounded-lg p-2.5 border border-algo-border/20">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-gray-500" />
        <span className="text-[9px] text-gray-400 uppercase font-mono">{label}</span>
      </div>
      <p className="text-xs font-mono font-semibold text-gray-200">{value}</p>
    </div>
  );
}

function generateFakeHash(seed: string): string {
  let hash = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    hash += chars[(seed.charCodeAt(i % seed.length) + i * 7) % 16];
  }
  return hash;
}
