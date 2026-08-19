import type { MuleNode } from '../types';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface LedgerTableProps {
  mules: MuleNode[];
  onRowClick: (node: MuleNode) => void;
}

export default function LedgerTable({ mules, onRowClick }: LedgerTableProps) {
  if (mules.length === 0) {
    return (
      <div className="glass-card rounded-xl border border-algo-border/30 p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No evaluated entities yet</p>
        <p className="text-xs text-gray-600 mt-1">Upload transaction data to begin continuous risk analysis</p>
      </div>
    );
  }

  // Count risk levels
  const highCount = mules.filter(m => m.riskScore >= 0.70).length;
  const medCount = mules.filter(m => m.riskScore >= 0.30 && m.riskScore < 0.70).length;
  const lowCount = mules.filter(m => m.riskScore < 0.30).length;

  return (
    <div className="glass-card rounded-xl border border-algo-border/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-algo-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-mono text-gray-300 uppercase tracking-widest font-semibold">
            Account Risk Registry ({mules.length})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
              HIGH: {highCount}
            </span>
            <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
              MEDIUM: {medCount}
            </span>
            <span className="text-[10px] font-mono bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
              LOW: {lowCount}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-500">
          Continuous Risk Score Scale [0.00 - 1.00]
        </span>
      </div>

      <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-algo-border/20 sticky top-0 bg-algo-dark/95 backdrop-blur-sm z-10">
              <th className="text-left px-4 py-2.5 font-mono font-medium uppercase tracking-wider">Account ID</th>
              <th className="text-center px-4 py-2.5 font-mono font-medium uppercase tracking-wider">Risk Level</th>
              <th className="text-center px-4 py-2.5 font-mono font-medium uppercase tracking-wider">Risk Score</th>
              <th className="text-left px-4 py-2.5 font-mono font-medium uppercase tracking-wider">Primary Risk Driver / Reasons</th>
              <th className="text-center px-4 py-2.5 font-mono font-medium uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {mules.map((mule) => {
              const displayScore = typeof mule.riskScore === 'number' ? mule.riskScore.toFixed(2) : '0.00';
              const level = mule.riskLevel || (mule.riskScore >= 0.70 ? 'HIGH' : mule.riskScore >= 0.30 ? 'MEDIUM' : 'LOW');

              return (
                <tr
                  key={mule.id}
                  onClick={() => onRowClick(mule)}
                  className="border-b border-algo-border/10 hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-gray-200 font-semibold">{mule.id}</td>
                  <td className="px-4 py-2.5 text-center">
                    <RiskLevelBadge level={level} />
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold">
                    <RiskScoreBadge score={mule.riskScore} displayScore={displayScore} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-gray-300 truncate max-w-[320px]">
                      {mule.reasons && mule.reasons.length > 0 ? (
                        <span className="text-[11px] text-gray-300">{mule.reasons[0]}</span>
                      ) : mule.flaggedPatterns && mule.flaggedPatterns.length > 0 ? (
                        <span className="text-[11px] text-gray-400">{mule.flaggedPatterns.join(', ')}</span>
                      ) : (
                        <span className="text-[11px] text-gray-500">Normal account activity</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button className="text-gray-500 hover:text-algo-teal transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskLevelBadge({ level }: { level: string }) {
  let color = 'bg-green-500/10 text-green-400 border-green-500/30';
  if (level === 'HIGH') {
    color = 'bg-red-500/15 text-red-400 border-red-500/30 font-bold animate-pulse';
  } else if (level === 'MEDIUM') {
    color = 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold';
  }

  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${color}`}>
      {level}
    </span>
  );
}

function RiskScoreBadge({ score, displayScore }: { score: number; displayScore: string }) {
  let color = 'text-green-400 bg-green-500/10 border-green-500/20';
  if (score >= 0.70) {
    color = 'text-red-400 bg-red-500/10 border-red-500/20';
  } else if (score >= 0.30) {
    color = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${color}`}>
      {displayScore}
    </span>
  );
}
