import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readAccount,executeTrade,ACCOUNT_KEY} from '../src/services/portfolio.js';
import {commitLocal,loadLocal,backupText,parseBackup,recoverLocal} from '../src/services/accountStore.js';
function mockStorage() {
  const values=new Map();let queue=Promise.resolve();
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:(_name,callback)=>{const result=queue.then(callback);queue=result.catch(()=>{});return result;}}}});
  return values;
}
test('simultaneous tabs cannot overwrite each other: second stale revision is rejected',async()=>{
  mockStorage();const first=loadLocal(),second=loadLocal();
  const nextA=executeTrade(first,'patrick-mahomes','buy',1,100).account;
  const nextB=executeTrade(second,'josh-allen','buy',1,100).account;
  const results=await Promise.allSettled([commitLocal(first,nextA),commitLocal(second,nextB)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(loadLocal().transactions.length,first.transactions.length+1);assert.equal(loadLocal().cash,first.cash-100);
});
test('backup round-trip preserves exact purchase costs, settings, execution records and watchlist',async()=>{
  const storage=mockStorage(),account=loadLocal();
  const saved=await commitLocal(account,{...account,settings:{...account.settings,name:'Evan Test'},watchlist:['josh-allen']});
  assert.deepEqual(parseBackup(backupText(saved)),saved);
  const next=await commitLocal(saved,{...saved,cash:saved.cash-1});
  assert.equal(JSON.parse(storage.get(ACCOUNT_KEY+':previous')).revision,saved.revision);assert.equal(next.revision,2);
});
test('corrupt stored records are preserved until an explicit reviewed recovery',async()=>{
  const storage=mockStorage();storage.set(ACCOUNT_KEY,'{broken');
  await assert.rejects(commitLocal(readAccount(null),readAccount(null)));
  assert.equal(storage.get(ACCOUNT_KEY),'{broken');
  const saved=await recoverLocal(readAccount(null));
  assert.equal(saved.revision,1);assert.equal(storage.get(ACCOUNT_KEY+':recovery'),'{broken');
  await assert.rejects(recoverLocal(saved),/readable/);
});
test('invalid and oversized imports fail without mutating the existing account',()=>{
  const storage=mockStorage();const initial=readAccount(null);storage.set(ACCOUNT_KEY,JSON.stringify(initial));
  assert.throws(()=>parseBackup('{"format":"other"}'));
  assert.throws(()=>parseBackup('x'.repeat(550001)));
  assert.throws(()=>readAccount(JSON.stringify({...initial,cash:-1})));
  assert.throws(()=>readAccount(JSON.stringify({...initial,password:'do-not-store'})));
  assert.deepEqual(loadLocal(),initial);
});
