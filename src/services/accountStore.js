import { ACCOUNT_KEY, readAccount } from './portfolio.js';
export function loadLocal(key = ACCOUNT_KEY) { return readAccount(localStorage.getItem(key)); }
export async function commitLocal(expected, next, key = ACCOUNT_KEY) {
  if(!navigator.locks) throw new Error('This browser cannot safely coordinate multiple tabs. Use a current browser to change the account.');
  return navigator.locks.request(`gridiron:${key}`, async()=>{
    const current=loadLocal(key);
    if(current.revision!==expected.revision) throw new Error('Your portfolio changed in another tab. The latest account has been loaded; review and retry.');
    const normalized=readAccount(JSON.stringify({...next,revision:current.revision+1}));
    // Keep the previous record recoverable before replacing it.
    const previous=localStorage.getItem(key);
    if(previous) localStorage.setItem(`${key}:previous`,previous);
    localStorage.setItem(key,JSON.stringify(normalized));
    return normalized;
  });
}
export function backupText(account) {
  return JSON.stringify({format:'gridiron-paper-backup',version:1,exportedAt:new Date().toISOString(),account},null,2);
}
export function parseBackup(text) {
  if(text.length>550000) throw new Error('Backup exceeds the 500 KB account limit.');
  const data=JSON.parse(text);
  if(data.format!=='gridiron-paper-backup' || data.version!==1) throw new Error('Choose a Gridiron Exchange backup JSON file.');
  return readAccount(JSON.stringify(data.account));
}
export function downloadBackup(account) {
  const url=URL.createObjectURL(new Blob([backupText(account)],{type:'application/json'}));
  const link=document.createElement('a'); link.href=url;link.download=`gridiron-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function recoverLocal(next,key=ACCOUNT_KEY) {
  if(!navigator.locks) throw new Error('Use a current browser to recover this record safely.');
  return navigator.locks.request(`gridiron:${key}`,async()=>{
    const raw=localStorage.getItem(key);
    try { readAccount(raw); throw new Error('The stored record is readable now. Reload before restoring.'); }
    catch(error) { if(error.message.startsWith('The stored record is readable')) throw error; }
    if(raw) localStorage.setItem(`${key}:recovery`,raw);
    const normalized=readAccount(JSON.stringify({...next,revision:1}));
    localStorage.setItem(key,JSON.stringify(normalized));return normalized;
  });
}
export function downloadOriginal(key=ACCOUNT_KEY) {
  const raw=localStorage.getItem(key);
  if(raw===null) throw new Error('No stored record exists.');
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='gridiron-original-record.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
