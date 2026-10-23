import React from 'react';
import { useState } from 'react';
import { UserRound, Bell, ShieldCheck, Link2, CircleHelp, SlidersHorizontal, Save, RotateCcw, Wallet, LockKeyhole } from 'lucide-react';

const money = n => n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export function Account({ cash, holdings, totalValue }) {
  const [name,setName]=useState('Evan Torres');
  const [email,setEmail]=useState('evan@example.com');
  const [dark,setDark]=useState(true);
  const [alerts,setAlerts]=useState(true);
  const [saved,setSaved]=useState(false);
  const reset=()=>{ if(window.confirm('Reset your demo account settings? This does not reset your simulated trades.')) {setName('Evan Torres');setEmail('evan@example.com');setDark(true);setAlerts(true);setSaved(false);} };
  return <div className="page-stack account-page">
    <div className="welcome-row"><div><p className="eyebrow">YOUR PROFILE</p><h1>Account Settings</h1><p className="muted">Manage your profile, preferences, and security settings.</p></div></div>
    <section className="panel profile-card"><div className="profile-photo">ET</div><div className="profile-main"><h2>{name || 'New player'}</h2><span className="role-pill"><UserRound size={12}/> Rookie Trader</span><p className="muted small">{email}</p></div><div className="level-area"><span>Level 1</span><div className="xp-track"><i/></div><small>250 / 1,000 XP</small></div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Account Overview</h2><p className="muted small">Your fictional-money game account</p></div></div><div className="account-stats"><div className="account-stat"><span className="icon-disc"><Wallet/></span><div><span className="muted small">Opening demo cash</span><strong>$7,519.50</strong></div></div><div className="account-stat"><span className="icon-disc"><SlidersHorizontal/></span><div><span className="muted small">Current Game Balance</span><strong>{money(cash+totalValue)}</strong></div></div></div></section>
    <section className="panel settings-list">
      <div className="settings-row"><span className="settings-icon"><UserRound/></span><div className="settings-copy"><strong>Profile Information</strong><span>Update your name and email address</span></div><div className="settings-fields"><input aria-label="Display name" value={name} onChange={e=>{setName(e.target.value);setSaved(false)}}/><input aria-label="Email address" type="email" value={email} onChange={e=>{setEmail(e.target.value);setSaved(false)}}/></div></div>
      <div className="settings-row"><span className="settings-icon"><SlidersHorizontal/></span><div className="settings-copy"><strong>Display Preferences</strong><span>Customize your appearance</span></div><span className="muted">Dark Mode</span><button className={`toggle ${dark?'enabled':''}`} onClick={()=>{setDark(!dark);setSaved(false)}} aria-label="Toggle dark mode"><i/></button></div>
      <div className="settings-row"><span className="settings-icon"><Bell/></span><div className="settings-copy"><strong>Notifications</strong><span>Manage demo alerts and email preferences</span></div><span className="muted">{alerts?'Enabled':'Disabled'}</span><button className={`toggle ${alerts?'enabled':''}`} onClick={()=>{setAlerts(!alerts);setSaved(false)}} aria-label="Toggle notifications"><i/></button></div>
      <div className="settings-row"><span className="settings-icon"><LockKeyhole/></span><div className="settings-copy"><strong>Privacy & Security</strong><span>Account security options for future implementation</span></div><span className="muted">Prototype</span></div>
      <div className="settings-row"><span className="settings-icon"><Link2/></span><div className="settings-copy"><strong>Connected Data</strong><span>ESPN full PPR · holdings refresh automatically</span></div><span className="muted">On demand</span></div>
      <div className="settings-row"><span className="settings-icon"><CircleHelp/></span><div className="settings-copy"><strong>Help & Support</strong><span>Gridiron Exchange prototype · no live trading support</span></div></div>
    </section>
    <div className="account-actions"><button className="primary-btn" onClick={()=>{setSaved(true);window.setTimeout(()=>setSaved(false),2200)}}><Save size={16}/>{saved?'Saved locally':'Save Changes'}</button><button className="outline-btn" onClick={reset}><RotateCcw size={16}/> Reset Settings</button></div>
    <div className="notice-box"><ShieldCheck size={24}/><div><strong>Paper Trading Only</strong><p>This is a simulated game. No deposits, withdrawals, brokerage connections, or real-money trades. Account settings are stored in local UI state only.</p></div></div>
  </div>;
}