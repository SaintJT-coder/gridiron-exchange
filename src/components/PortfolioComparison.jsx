import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { holdingCost } from '../services/portfolio.js';

export function PortfolioComparison({ holdings, players }) {
  const data = holdings.map(h => {
    const player = players.find(p => p.id === h.playerId);
    return { name: player?.name || h.playerId, cost: holdingCost(h) / 100,
      value: Math.round((player?.price || 0) * h.shares * 100) / 100 };
  });
  return <section className="panel performance-panel"><div className="panel-heading"><div><h2>Purchase cost vs. current value</h2><p className="muted small">Remaining shares · recorded purchase costs · estimates until quotes finish loading</p></div></div>
    {data.length ? <div className="chart-area portfolio-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><XAxis dataKey="name" hide/><YAxis hide/><Tooltip contentStyle={{background:'#071a2c',border:'1px solid #1d4661',color:'#e9f4ff'}} formatter={v=>Number(v).toLocaleString('en-US',{style:'currency',currency:'USD'})}/><Legend/><Bar dataKey="cost" name="Purchase cost" fill="#2e9cf5"/><Bar dataKey="value" name="Current value" fill="#11d6b0"/></BarChart></ResponsiveContainer></div> : <p className="muted">No open holdings.</p>}
  </section>;
}
