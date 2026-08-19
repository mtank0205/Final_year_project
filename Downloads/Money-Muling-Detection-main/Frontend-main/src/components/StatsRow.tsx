import { TrendingUp, Users, AlertTriangle, Waypoints } from 'lucide-react';

interface StatsRowProps {
  summary: any | null;
}

export default function StatsRow({ summary }: StatsRowProps) {
  const stats = [
    {
      label: 'Transactions Scanned',
      value: summary?.total_transactions ? summary.total_transactions.toLocaleString() : '—',
      icon: TrendingUp,
      color: 'text-algo-teal',
      bgColor: 'bg-algo-teal/10',
      borderColor: 'border-algo-teal/20',
    },
    {
      label: 'Flagged Accounts',
      value: summary?.suspicious_accounts_found ? summary.suspicious_accounts_found.toString() : '—',
      icon: Users,
      color: 'text-algo-red',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      label: 'Avg Risk Score',
      value: summary?.risk_score_distribution?.mean ? `${Math.round(summary.risk_score_distribution.mean * 100)}%` : '—',
      icon: AlertTriangle,
      color: 'text-algo-amber',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      label: 'Detected Cycles',
      value: summary?.fraud_rings_found ? summary.fraud_rings_found.toString() : '0',
      icon: Waypoints,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`glass-card rounded-xl p-4 ${stat.borderColor} transition-all duration-300 hover:scale-[1.02] cursor-default`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-gray-500 mt-1">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
