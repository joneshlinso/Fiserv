import React from 'react';
import { Server, ShieldAlert } from 'lucide-react';

export default function Architecture() {
  return (
    <div className="flex flex-col gap-6">
      {/* ── TOP: Features ── */}
      <div className="flex gap-6">
        {/* Card 1 */}
        <div className="w-1/2 premium-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-base)] flex items-center justify-center border border-[var(--border)]">
              <Server size={18} className="text-[var(--text-primary)]" />
            </div>
            <h3 className="card-title text-lg">Current Build</h3>
          </div>
          <ul className="space-y-2 ml-2">
            <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /> FastAPI HTTP Endpoints
            </li>
            <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /> Python Dicts (In-Memory State)
            </li>
            <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /> Vite + React Frontend
            </li>
          </ul>
        </div>

        {/* Card 2 */}
        <div className="w-1/2 premium-card" style={{ background: 'var(--accent-green-dim)', borderColor: 'rgba(74,222,128,0.3)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent-green)] flex items-center justify-center text-[#0D0D0F]">
              <ShieldAlert size={18} />
            </div>
            <h3 className="card-title text-lg" style={{ color: 'var(--accent-green)' }}>Enterprise Ready</h3>
          </div>
          <ul className="space-y-2 ml-2">
            <li className="flex items-center gap-2 text-sm text-[#0D0D0F]" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]" /> Apache Kafka (Event Streaming)
            </li>
            <li className="flex items-center gap-2 text-sm text-[#0D0D0F]" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]" /> Redis Cluster (Distributed Cache)
            </li>
            <li className="flex items-center gap-2 text-sm text-[#0D0D0F]" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]" /> PostgreSQL (Audit & Compliance)
            </li>
            <li className="flex items-center gap-2 text-sm text-[#0D0D0F]" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]" /> Kubernetes (Auto-scaling Pods)
            </li>
          </ul>
        </div>
      </div>

      {/* ── BOTTOM: SVG Diagram ── */}
      <div className="premium-card flex flex-col items-center py-12">
        <svg viewBox="0 0 900 200" className="w-full max-w-[800px]">
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#3D3D50" />
            </marker>
          </defs>

          {/* ARROWS */}
          <line x1="140" y1="100" x2="190" y2="100" stroke="#3D3D50" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <line x1="310" y1="100" x2="360" y2="100" stroke="#3D3D50" strokeWidth="2" markerEnd="url(#arrowhead)" />
          
          <line x1="480" y1="80" x2="550" y2="50" stroke="#3D3D50" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <line x1="480" y1="100" x2="550" y2="100" stroke="#3D3D50" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <line x1="480" y1="120" x2="550" y2="150" stroke="#3D3D50" strokeWidth="2" markerEnd="url(#arrowhead)" />

          <line x1="670" y1="50" x2="740" y2="50" stroke="#3D3D50" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* BOXES */}
          <rect x="20" y="80" width="120" height="40" rx="10" fill="#141418" stroke="#2A2A35" strokeWidth="2" />
          <text x="80" y="104" textAnchor="middle" fill="#8B8B9A" fontFamily="DM Mono" fontSize="11">UPI Stream</text>

          <rect x="190" y="80" width="120" height="40" rx="10" fill="#141418" stroke="#2A2A35" strokeWidth="2" />
          <text x="250" y="104" textAnchor="middle" fill="#8B8B9A" fontFamily="DM Mono" fontSize="11">Kafka Topic</text>

          <rect x="360" y="70" width="120" height="60" rx="10" fill="rgba(167,139,250,0.08)" stroke="#A78BFA" strokeWidth="2" />
          <text x="420" y="104" textAnchor="middle" fill="#F1F1F3" fontFamily="DM Mono" fontSize="11">Rule Workers ×N</text>

          <rect x="550" y="30" width="120" height="40" rx="10" fill="#141418" stroke="#2A2A35" strokeWidth="2" />
          <text x="610" y="54" textAnchor="middle" fill="#8B8B9A" fontFamily="DM Mono" fontSize="11">Redis Cache</text>

          <rect x="550" y="80" width="120" height="40" rx="10" fill="#141418" stroke="#2A2A35" strokeWidth="2" />
          <text x="610" y="104" textAnchor="middle" fill="#8B8B9A" fontFamily="DM Mono" fontSize="11">Postgres Audit</text>

          <rect x="550" y="130" width="120" height="40" rx="10" fill="#141418" stroke="#2A2A35" strokeWidth="2" />
          <text x="610" y="154" textAnchor="middle" fill="#8B8B9A" fontFamily="DM Mono" fontSize="11">Alert Webhook</text>

          <rect x="740" y="30" width="120" height="40" rx="10" fill="#141418" stroke="#2A2A35" strokeWidth="2" />
          <text x="800" y="54" textAnchor="middle" fill="#8B8B9A" fontFamily="DM Mono" fontSize="11">Dashboard</text>

        </svg>

        <p className="mt-8 text-[13px] text-[var(--text-secondary)] italic text-center max-w-[600px]">
          In the hackathon build, Python dicts replace Redis and Kafka.<br/>
          Swap them in with 2 config lines to scale to 1M+ txns/day.
        </p>
      </div>
    </div>
  );
}
