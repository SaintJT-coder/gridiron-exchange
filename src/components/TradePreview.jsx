import React, { useEffect, useState } from 'react';
import { Modal } from './Modal.jsx';
import { fetchMarket, tradingBlock } from '../services/market.js';
import { executeTrade } from '../services/portfolio.js';
const money=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export function TradePreview({draft,account,onClose,onConfirm}) {
  const [shares,setShares]=useState(1),[market,setMarket]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[clock,setClock]=useState(Date.now());
  useEffect(()=>{let active=true;fetchMarket(true).then(m=>active&&setMarket(m)).catch(e=>active&&setError(e.message));const interval=setInterval(()=>setClock(Date.now()),1000);return()=>{active=false;clearInterval(interval);};},[]);
  const player=market?.players.find(p=>p.id===draft.playerId);
  const block=market?tradingBlock(market,player,clock):'Loading verified market quote…';
  const preview=player?executeTrade(account,draft.playerId,draft.side,shares,player.price):null;
  const changed=account.revision!==draft.revision;
  const confirm=async()=>{
    setBusy(true);setError('');
    try {
      const fresh=await fetchMarket(true), current=fresh.players.find(p=>p.id===draft.playerId);
      const reason=tradingBlock(fresh,current);
      if(reason) {setMarket(fresh);throw new Error(reason);}
      if(current.price!==player.price){setMarket(fresh);throw new Error('The price changed. Review the updated total and confirm again.');}
      await onConfirm({...draft,shares,price:current.price,market:fresh});
    } catch(e){setError(e.message);} finally{setBusy(false);}
  };
  return <Modal title={`${draft.side==='buy'?'Buy':'Sell'} ${player?.name||draft.name}`} onClose={onClose}>
    <p className="muted">Paper trade · no real money</p>
    {player&&<><div className="detail-metrics"><div><span>Price per share</span><strong>{money(player.price)}</strong></div><div><span>Available cash</span><strong>{money(account.cash)}</strong></div></div><label className="field-label">Number of shares<input aria-label="Number of shares" type="number" min="1" max="1000000" step="1" value={shares} onChange={e=>setShares(Number(e.target.value))}/></label><p className="trade-total">Total: <strong>{money(Math.round(player.price*100)*shares/100||0)}</strong></p><p className="muted">Cash after trade: {preview?.account?money(preview.account.cash):'—'}</p></>}
    {(block||changed||preview?.error||error)&&<p className="notice-box" role="alert">{error|| (changed?'Your account changed in another tab or device. Close and reopen this preview.':block||preview?.error)}</p>}
    <div className="account-actions"><button className="primary-btn" disabled={busy||!!block||changed||!!preview?.error||!player} onClick={confirm}>{busy?'Recording…':`Confirm ${draft.side==='buy'?'purchase':'sale'}`}</button><button className="outline-btn" onClick={onClose}>Cancel</button></div>
  </Modal>;
}
