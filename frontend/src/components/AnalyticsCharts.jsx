import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function AnalyticsCharts({ transactions, metrics }) {
  // Prep data for risk score trend (reverse to show chronological order)
  const trendData = [...transactions]
    .slice(0, 15)
    .reverse()
    .map((tx, idx) => ({
      index: idx + 1,
      id: tx.id.substring(4, 9),
      score: tx.risk_score,
      amount: parseFloat(tx.amount)
    }));

  // Prep data for pie chart distribution
  const alertData = [
    { name: 'Low Risk', value: metrics.alertCounts.LOW, color: '#10B981' },
    { name: 'Medium Risk', value: metrics.alertCounts.MEDIUM, color: '#F59E0B' },
    { name: 'High Risk', value: metrics.alertCounts.HIGH, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // Fallback default counts if no data exists
  const hasData = alertData.length > 0;
  const pieData = hasData ? alertData : [
    { name: 'Low Risk', value: 1, color: '#374151' },
    { name: 'Medium Risk', value: 0, color: '#374151' },
    { name: 'High Risk', value: 0, color: '#374151' }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-card border border-white/10 p-3 rounded-lg text-xs shadow-xl">
          <p className="text-gray-400 font-medium">Tx ID: ...{data.id}</p>
          <p className="text-white font-bold mt-1">Risk Score: <span className="text-indigo-400">{data.score}</span></p>
          <p className="text-gray-400 mt-0.5">Amount: ₹{data.amount}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Risk Score Trend Line */}
      <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl border border-white/5 flex flex-col justify-between min-h-[300px]">
        <div>
          <h2 className="text-base font-bold text-white mb-1">Risk Severity Trend</h2>
          <p className="text-xs text-gray-400 mb-4">Tracking risk score trajectory of the last 15 payments</p>
        </div>
        <div className="w-full h-52 mt-2">
          {trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">
              Awaiting data streams to render chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" stroke="#4B5563" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#4B5563" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#scoreColor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alert Severity Distribution */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl border border-white/5 flex flex-col justify-between min-h-[300px]">
        <div>
          <h2 className="text-base font-bold text-white mb-1">Severity Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">Visual ratio of processed risk alerts</p>
        </div>
        <div className="flex-1 flex items-center justify-center relative h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, hasData ? name : 'No Data']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute text-center">
            <span className="block text-2xl font-extrabold text-white">
              {hasData ? metrics.totalTransactions : 0}
            </span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Txns</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-dark-lighter/35 border border-white/5 rounded-xl p-2">
            <span className="block text-xs font-bold text-emerald-400">{metrics.alertCounts.LOW}</span>
            <span className="text-[9px] text-gray-500 font-semibold uppercase">Low</span>
          </div>
          <div className="bg-dark-lighter/35 border border-white/5 rounded-xl p-2">
            <span className="block text-xs font-bold text-amber-400">{metrics.alertCounts.MEDIUM}</span>
            <span className="text-[9px] text-gray-500 font-semibold uppercase">Medium</span>
          </div>
          <div className="bg-dark-lighter/35 border border-white/5 rounded-xl p-2">
            <span className="block text-xs font-bold text-rose-500">{metrics.alertCounts.HIGH}</span>
            <span className="text-[9px] text-gray-500 font-semibold uppercase">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
