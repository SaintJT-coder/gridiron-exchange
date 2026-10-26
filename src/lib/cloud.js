import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, runTransaction, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { readAccount } from '../services/portfolio.js';
const app=initializeApp({apiKey:'AIzaSyCvD9Heql9F9UT5wLGTeQXPaGNjISUzxL8',authDomain:'gridiron-exchange-eb38b.firebaseapp.com',projectId:'gridiron-exchange-eb38b',appId:'1:491997148196:web:965a77ef18e0511499d4b1'});
export const auth=getAuth(app);
const db=getFirestore(app);
const reference=uid=>doc(db,'paperBackups',uid);
const decode=snapshot=>{
  const account=readAccount(snapshot.data().payload);
  if(account.revision!==snapshot.data().revision) throw new Error('Cloud backup revision does not match its account record. Export and recover the record before continuing.');
  return account;
};
export const observeUser=callback=>onAuthStateChanged(auth,callback);
export async function signIn(email,password,register=false) {
  if(register) return createUserWithEmailAndPassword(auth,email,password);
  return signInWithEmailAndPassword(auth,email,password);
}
export const logOut=()=>signOut(auth);
export const resetPassword=email=>sendPasswordResetEmail(auth,email);
export async function loadCloud(uid) {
  const snap=await getDocFromServer(reference(uid));
  if(!snap.exists()) return null;
  return decode(snap);
}
export async function saveCloud(uid, expectedRevision, account) {
  const ref=reference(uid);
  return runTransaction(db,async transaction=>{
    const snap=await transaction.get(ref);
    const revision=snap.exists()?snap.data().revision:0;
    if(revision!==expectedRevision) throw new Error('Cloud account changed on another device. Reload the cloud account before retrying.');
    const next=readAccount(JSON.stringify({...account,revision:revision+1}));
    const payload=JSON.stringify(next);
    if(new TextEncoder().encode(payload).length>500000) throw new Error('Cloud backup exceeds 500 KB. Export your account before continuing.');
    transaction.set(ref,{uid,revision:next.revision,payload,createdAt:snap.exists()?snap.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    return next;
  });
}
export function watchCloud(uid, callback, onError) {
  return onSnapshot(reference(uid),{includeMetadataChanges:true},snap=>{
    if(snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
    try { callback(snap.exists()?decode(snap):null); }
    catch(error) { onError(error); }
  },onError);
}
