import { tradingBlock } from './marketLedger.js';
let cached;
let promise;
export async function fetchMarket(force = false) {
  if(!force && cached && Date.now()-cached.fetchedAt<30000) return cached.market;
  if(promise) return promise;
  promise=fetch(`${import.meta.env.BASE_URL}market.json`,{cache:'no-store',signal:AbortSignal.timeout(15000)})
    .then(async response=>{
      if(!response.ok) throw new Error('The shared market update is unavailable. Your account is unchanged.');
      const market=await response.json();
      if(market.version!==1 || !Array.isArray(market.players) || !Array.isArray(market.schedule)) throw new Error('Invalid market update. Trading is paused.');
      cached={market,fetchedAt:Date.now()}; return market;
    }).finally(()=>{promise=null;});
  return promise;
}
export { tradingBlock };
export async function loadSettledHistory(player) {
  const market=await fetchMarket(); const entry=market.players.find(p=>p.id===player.id);
  if(!entry) throw new Error('This player is not present in the published market.');
  return {games:[...(entry.archive||[]),...entry.history].slice(-5).reverse(),quote:{...entry.history.at(-1),price:entry.price,change:entry.change,complete:entry.complete},updatedAt:market.generatedAt,block:tradingBlock(market,entry)};
}
