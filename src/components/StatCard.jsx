import React from 'react';
export function StatCard({ label, value, change, sub, accent = false }) {
  return <section className={`stat-card ${accent ? 'stat-accent' : ''}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {change && <div className={`stat-change ${change.startsWith('-') ? 'negative' : ''}`}>{change}</div>}
    {sub && <div className="stat-sub">{sub}</div>}
  </section>;
}