import React, { useState } from 'react';
import { LayoutDashboard, Zap, Sliders, Network, Server, AlignJustify } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Simulator from './components/Simulator';
import RuleTuner from './components/RuleTuner';
import FraudGraph from './components/FraudGraph';
import Architecture from './components/Architecture';

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'simulator',    label: 'Simulator',    icon: Zap },
  { id: 'tuner',        label: 'Rule Tuner',   icon: Sliders },
  { id: 'graph',        label: 'Fraud Graph',  icon: Network },
  { id: 'architecture', label: 'Architecture', icon: Server },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [compact, setCompact] = useState(false);

  return (
    <div
      className="flex min-h-screen bg-[var(--bg-base)]"
      data-compact={compact ? 'true' : 'false'}
    >
      {/* ── SIDEBAR ── */}
      <aside className="w-[220px] shrink-0 bg-[var(--bg-base)] border-r border-[var(--border)] flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center text-[#0D0D0F] font-bold text-lg">
              F
            </div>
            <div>
              <h1 className="font-sans font-semibold text-sm text-[var(--text-primary)] leading-tight">
                Fiserv UPI
              </h1>
              <p className="font-sans text-[10px] text-[var(--text-secondary)]">Fraud Detector</p>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-sans font-medium transition-colors
                    ${isActive 
                      ? 'bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] border-l-2 border-[var(--accent-purple)]' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                    }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* ── COMPACT MODE TOGGLE ── */}
          <div className="pt-4 border-t border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-2 px-1">View</p>
            <button
              onClick={() => setCompact(c => !c)}
              className={`compact-toggle ${compact ? 'active' : ''}`}
              title="Toggle compact mode for higher data density"
              aria-pressed={compact}
            >
              <span className="flex items-center gap-2">
                <AlignJustify size={14} />
                Compact Mode
              </span>
              <span className={`toggle-pill ${compact ? 'on' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 ml-[220px] p-[28px] overflow-y-auto">
        <header className="mb-8">
          <h2 className="page-title">
            {TABS.find(t => t.id === activeTab)?.label}
          </h2>
        </header>
        
        <div className="w-full max-w-[1440px]">
          {activeTab === 'dashboard'    && <Dashboard compact={compact} />}
          {activeTab === 'simulator'    && <Simulator />}
          {activeTab === 'tuner'        && <RuleTuner />}
          {activeTab === 'graph'        && <FraudGraph />}
          {activeTab === 'architecture' && <Architecture />}
        </div>
      </main>
    </div>
  );
}
