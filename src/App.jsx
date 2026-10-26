import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerDetails } from './components/PlayerDetails.jsx';
import { TradePreview } from './components/TradePreview.jsx';
import { AppShell } from './components/AppShell.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Portfolio } from './pages/Portfolio.jsx';
import { Account } from './pages/Account.jsx';
import { players as seedPlayers } from './data/players.js';
import { ACCOUNT_KEY, readAccount, portfolioTotals, executeTrade } from './services/portfolio.js';
import { loadLocal, commitLocal, downloadBackup, recoverLocal, downloadOriginal } from './services/accountStore.js';
import { fetchMarket, tradingBlock } from './services/market.js';

export default function App() {
  const [loaded]=useState(()=>{try{return {account:loadLocal()};}catch(e){return {account:readAccount(null),error:e.message};}});
  const [account,setAccount]=useState(loaded.account),accountRef=useRef(account),keyRef=useRef(ACCOUNT_KEY);
  const [loadError,setLoadError]=useState(loaded.error||''),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [tab,setTab]=useState('Dashboard'),[selectedId,setSelectedId]=useState(null),[draft,setDraft]=useState(null);
  const [market,setMarket]=useState(null),[marketError,setMarketError]=useState(''),[refreshing,setRefreshing]=useState(false),[clock,setClock]=useState(Date.now());
  const apiRef=useRef(null),uidRef=useRef(null),activeUid=useRef(null),mutating=useRef(false);
  const [cloudNeeded,setCloudNeeded]=useState(()=>{try{return !!localStorage.getItem('gridiron-active-cloud');}catch{return false;}});
  useEffect(()=>{if(tab==='Account')setCloudNeeded(true);},[tab]);
  const [cloudApi,setCloudApi]=useState(null),[cloud,setCloud]=useState({user:null,remote:null,active:false,loading:false,error:''});
  const adopt=useCallback(next=>{accountRef.current=next;setAccount(next);},[]);
  const guest=useCallback(()=>{activeUid.current=null;keyRef.current=ACCOUNT_KEY;try{adopt(loadLocal());setLoadError('');}catch(e){setLoadError(e.message);adopt(readAccount(null));}setDraft(null);},[adopt]);
  const activate=useCallback((uid,next)=>{
    keyRef.current=ACCOUNT_KEY+':'+uid;activeUid.current=uid;adopt(next);setLoadError('');setDraft(null);
    try{localStorage.setItem(keyRef.current,JSON.stringify(next));localStorage.setItem('gridiron-active-cloud',uid);}catch{setError('Cloud is saved, but the local cache could not be written.');}
    setCloud(old=>({...old,active:true,remote:next,loading:false,error:''}));
  },[adopt]);
  useEffect(()=>{
    if(!cloudNeeded)return;
    let alive=true,stop;
    setCloud(old=>({...old,loading:true}));
    import('./lib/cloud.js').then(api=>{
      if(!alive)return;apiRef.current=api;setCloudApi(api);
      stop=api.observeUser(async user=>{
        uidRef.current=user?.uid||null;
        if(!user){if(activeUid.current)guest();setCloud({user:null,remote:null,active:false,loading:false,error:''});return;}
        if(activeUid.current&&activeUid.current!==user.uid)guest();
        setCloud(old=>({...old,user,loading:true,error:''}));
        try{
          const remote=await api.loadCloud(user.uid);if(!alive||uidRef.current!==user.uid)return;
          setCloud(old=>({...old,remote,loading:false,error:''}));
          let resume=false;try{resume=localStorage.getItem('gridiron-active-cloud')===user.uid;}catch{}
          if(resume&&remote)activate(user.uid,remote);
        }catch(e){if(alive)setCloud(old=>({...old,loading:false,error:e.message}));}
      });
    }).catch(e=>setCloud(old=>({...old,error:'Cloud connection unavailable: '+e.message})));
    return()=>{alive=false;stop?.();};
  },[activate,guest,cloudNeeded]);
  useEffect(()=>{
    if(!cloud.active||!cloud.user||!apiRef.current)return;
    const uid=cloud.user.uid;
    return apiRef.current.watchCloud(uid,next=>{
      if(activeUid.current!==uid)return;
      if(next&&next.revision>accountRef.current.revision){adopt(next);setDraft(null);try{localStorage.setItem(keyRef.current,JSON.stringify(next));}catch{}setMessage('Portfolio updated from another device.');}
      setCloud(old=>({...old,remote:next,error:''}));
    },e=>setCloud(old=>({...old,error:e.message})));
  },[cloud.active,cloud.user,adopt]);
  useEffect(()=>{
    const sync=event=>{if(event.key!==keyRef.current)return;try{const next=loadLocal(keyRef.current);if(next.revision!==accountRef.current.revision){adopt(next);setDraft(null);setMessage('Portfolio updated from another tab.');}}catch(e){setLoadError(e.message);}};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[adopt]);
  const mutate=useCallback(async next=>{
    if(mutating.current)throw new Error('Another account change is in progress. Please retry.');
    if(loadError)throw new Error('The stored account needs recovery before it can be changed.');
    mutating.current=true;
    const expected=accountRef.current, key=keyRef.current,uid=activeUid.current;
    try{
      let saved;
      if(uid){saved=await apiRef.current.saveCloud(uid,expected.revision,next);if(activeUid.current!==uid)throw new Error('Sign-in changed. Reopen this account to see the saved change.');try{localStorage.setItem(key,JSON.stringify(saved));}catch{setError('Saved to cloud; local cache unavailable.');}}
      else saved=await commitLocal(expected,next,key);
      adopt(saved);return saved;
    }catch(e){
      try{const latest=uid?await apiRef.current.loadCloud(uid):loadLocal(key);if(latest&&keyRef.current===key)adopt(latest);}catch{}
      throw e;
    }finally{mutating.current=false;}
  },[loadError,adopt]);
  const connectCloud=async useRemote=>{
    const api=apiRef.current,uid=uidRef.current;if(!api||!uid)throw new Error('Sign in first.');
    const remote=await api.loadCloud(uid);
    if(useRemote){if(remote)activate(uid,remote);else setCloud(old=>({...old,remote:null,error:'',loading:false}));return;}
    if(remote)throw new Error('A cloud portfolio already exists. Use it, or export this guest portfolio before importing it into the cloud account.');
    if(loadError)throw new Error('Recover the browser account before backing it up.');
    const next=await api.saveCloud(uid,0,accountRef.current);activate(uid,next);setMessage('Cloud backup created. Guest holdings remain separate.');
  };
  const disconnectCloud=async()=>{await apiRef.current.logOut();try{localStorage.removeItem('gridiron-active-cloud');}catch{}guest();setCloud(old=>({...old,active:false}));};
  const refreshMarket=useCallback(async(force=true)=>{setRefreshing(true);try{setMarket(await fetchMarket(force));setMarketError('');}catch(e){setMarketError(e.message);}finally{setRefreshing(false);}},[]);
  useEffect(()=>{refreshMarket();const interval=setInterval(()=>refreshMarket(),60000),tick=setInterval(()=>setClock(Date.now()),15000);const focus=()=>refreshMarket();window.addEventListener('focus',focus);return()=>{clearInterval(interval);clearInterval(tick);window.removeEventListener('focus',focus);};},[refreshMarket]);
  useEffect(()=>{document.documentElement.dataset.theme=account.settings.theme;},[account.settings.theme]);
  const roster=useMemo(()=>seedPlayers.map(seed=>{const p=market?.players.find(p=>p.id===seed.id);return {...seed,...p,priced:!!p?.complete&&!p.error,change:p?.complete&&!p.error?p.change:null,shares:account.holdings.find(h=>h.playerId===seed.id)?.shares||0,tradeBlock:tradingBlock(market,p,clock),trend:(p?.history||[]).filter(g=>g.settlement==='settled').slice(-7).map(g=>g.price)};}),[market,account.holdings,clock]);
  const totals=portfolioTotals(account.holdings,roster);
  const fresh=market&&clock-Date.parse(market.generatedAt)<20*60000;
  const quoteStatus=Object.fromEntries(roster.map(p=>[p.id,p.priced&&fresh?'ready':refreshing?'loading':'unavailable']));
  const status={ready:account.holdings.filter(h=>quoteStatus[h.playerId]==='ready').length,total:account.holdings.length,loading:refreshing};
  const selectedPlayer=useMemo(()=>market?.players.find(p=>p.id===selectedId)||seedPlayers.find(p=>p.id===selectedId),[market,selectedId]);
  const closeDetails=useCallback(()=>setSelectedId(null),[]),closeTrade=useCallback(()=>setDraft(null),[]),onQuote=useCallback(()=>{},[]);
  const trade=(id,side)=>{const p=roster.find(p=>p.id===id);setDraft({playerId:id,side,name:p?.name,revision:accountRef.current.revision,key:keyRef.current});setError('');};
  const confirmTrade=async input=>{
    if(input.revision!==accountRef.current.revision||input.key!==keyRef.current)throw new Error('Account changed. Reopen the preview.');
    const p=input.market.players.find(p=>p.id===input.playerId),block=tradingBlock(input.market,p);
    if(block)throw new Error(block);
    const result=executeTrade(accountRef.current,input.playerId,input.side,input.shares,p.price);
    if(result.error)throw new Error(result.error);
    result.account.transactions[0].marketUpdatedAt=input.market.generatedAt;
    result.account.transactions[0].settlementId=p.history.filter(g=>g.settlement==='settled').at(-1)?.id;
    await mutate(result.account);setDraft(null);setMarket(input.market);
    if(accountRef.current.settings.alerts)setMessage(input.shares+' '+p.name+' share(s) '+(input.side==='buy'?'bought':'sold')+' at $'+p.price.toFixed(2)+'. Execution price and purchase cost saved.');
  };
  const toggleWatch=id=>{const old=accountRef.current;mutate({...old,watchlist:old.watchlist.includes(id)?old.watchlist.filter(x=>x!==id):[...old.watchlist,id]}).catch(e=>setError(e.message));};
  const exportAccount=()=>{try{if(loadError)downloadOriginal(keyRef.current);else downloadBackup(accountRef.current);}catch(e){setError(e.message);}};
  const restoreAccount=async next=>{if(loadError&&!activeUid.current){adopt(await recoverLocal(next,keyRef.current));setLoadError('');}else await mutate(next);setMessage('Backup restored.');};
  return <AppShell tab={tab} setTab={setTab} settings={account.settings}>
    {loadError&&<p className="notice-box" role="alert">Stored account could not be read: {loadError}. Your original record is untouched. Sign in to recover a cloud portfolio.</p>}
    {error&&<p className="notice-box" role="alert">{error}</p>}
    {message&&<div className="notice-box" role="status">{message}<button className="outline-btn" onClick={()=>setMessage('')}>Dismiss</button></div>}
    <div className="market-health"><span>{market?'Market updated '+new Date(market.generatedAt).toLocaleString():'Connecting to shared market…'}{marketError?' · '+marketError:''}</span><button className="outline-btn" disabled={refreshing} onClick={()=>refreshMarket()}>{refreshing?'Refreshing…':'Refresh market'}</button></div>
    {tab==='Dashboard'&&<Dashboard cash={account.cash} totalValue={totals.value} totalReturn={totals.gain} returnPct={totals.returnPct} costBasis={totals.cost} holdings={account.holdings} quoteStatus={status} players={roster} watchlist={account.watchlist} toggleWatch={toggleWatch} trade={trade} onPlayerClick={setSelectedId} market={market} name={account.settings.name}/>}
    {tab==='Portfolio'&&<Portfolio cash={account.cash} totalValue={totals.value} totalReturn={totals.gain} returnPct={totals.returnPct} costBasis={totals.cost} quoteStatus={quoteStatus} status={status} refreshPortfolio={refreshMarket} players={roster} holdings={account.holdings} transactions={account.transactions} trade={trade} onPlayerClick={setSelectedId}/>}
    {tab==='Account'&&<Account cash={account.cash} totalValue={totals.value} account={account} saveSettings={settings=>mutate({...accountRef.current,settings})} exportAccount={exportAccount} restoreAccount={restoreAccount} cloud={cloud} cloudApi={cloudApi} connectCloud={connectCloud} disconnectCloud={disconnectCloud}/>}
    {selectedId&&<PlayerDetails key={selectedId} player={selectedPlayer} onClose={closeDetails} onQuote={onQuote}/>}
    {draft&&<TradePreview draft={draft} account={account} onClose={closeTrade} onConfirm={confirmTrade}/>}
  </AppShell>;
}
