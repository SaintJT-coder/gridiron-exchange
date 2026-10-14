import React from 'react';
import { Activity, CircleUserRound, LayoutDashboard, WalletCards, ShieldCheck, ChevronDown, Menu } from 'lucide-react';

export function AppShell({ tab, setTab, children }) {
  const tabs = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Portfolio', icon: WalletCards },
    { label: 'Account', icon: CircleUserRound },
  ];
  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setTab('Dashboard')} aria-label="Go to dashboard">
        <span className="brand-mark"><ShieldCheck size={20} /></span>
        <span>GRIDIRON<br/>EXCHANGE</span>
      </button>
      <button className="league-select">NFL <ChevronDown size={14}/></button>
      <nav className="main-nav" aria-label="Main navigation">
        {tabs.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${tab === label ? 'active' : ''}`} onClick={() => setTab(label)}><Icon size={15}/>{label}</button>)}
      </nav>
      <span className="paper-pill"><span/> PAPER MONEY</span>
      <button className="user-chip" onClick={() => setTab('Account')}><span className="user-avatar">ET</span><span className="user-name">Evan T.</span></button>
      <button className="mobile-menu" onClick={() => setTab(tab === 'Dashboard' ? 'Portfolio' : tab === 'Portfolio' ? 'Account' : 'Dashboard')} aria-label="Cycle navigation"><Menu/></button>
    </header>
    <main className="page-content">{children}</main>
    <footer className="footer"><span>GRIDIRON EXCHANGE</span><span>SIMULATED CURRENCY · NO REAL-MONEY TRADING</span><span>DEMO MARKET DATA</span></footer>
  </div>;
}