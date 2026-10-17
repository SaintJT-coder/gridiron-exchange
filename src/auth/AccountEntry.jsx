import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase.js';

export default function AccountEntry({ children }) {
  const [user, setUser] = useState(undefined);
  const [account, setAccount] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const [demo, setDemo] = useState(false);
  useEffect(() => onAuthStateChanged(auth, next => { setAccount(null); setMessage(''); setUser(next); }), []);
  useEffect(() => {
    setAccount(null);
    if (!user) return;
    let active = true;
    let unsubscribe = () => {};
    httpsCallable(functions, 'ensureSeasonAccount')({}).then(() => {
      if (!active) return;
      unsubscribe = onSnapshot(doc(db, 'seasons', '2026', 'accounts', user.uid), snap => {
        if (active) setAccount(snap.exists() ? snap.data() : null);
      }, () => { if (active) setMessage('Unable to read your saved account. Please retry.'); });
    }).catch(() => { if (active) setMessage('Account setup is unavailable. The backend and App Check must be configured before your balance can load.'); });
    return () => { active = false; unsubscribe(); };
  }, [user, retry]);
  const run = async action => {
    setBusy(true); setMessage('');
    try { await action(); setPassword(''); }
    catch (error) { setMessage(error.code === 'auth/popup-blocked' ? 'Allow the sign-in popup in Safari or use email and password.' : 'Unable to complete that request. Check your details and try again.'); }
    finally { setBusy(false); }
  };
  if (demo) return <><div className="notice-box"><strong>Demo: sample balances; changes reset on refresh.</strong><button onClick={() => setDemo(false)}>Back to sign-in</button></div>{children}</>;
  return <main className="page-content"><section className="panel page-stack" style={{ maxWidth: 520, margin: '48px auto', padding: 24 }}>
    <h1>Gridiron Exchange</h1>
    {user === undefined ? <p>Checking your session…</p> : user ? <>
      <p>Signed in as {user.email || 'player'}</p>
      {account ? <><h2>{(account.cashCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} fictional cash</h2><p>Your account is saved. Shared markets and trading are coming in the next integration step.</p></> : <p>Loading your saved account…</p>}
      <button disabled={busy} onClick={() => { setMessage(''); setRetry(v => v + 1); }}>Retry account setup</button>
      <button disabled={busy} onClick={() => run(() => signOut(auth))}>Sign out</button>
    </> : <>
      <h2>{register ? 'Create account' : 'Sign in'}</h2>
      <form className="page-stack" onSubmit={event => { event.preventDefault(); run(() => (register ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, email.trim(), password)); }}>
        <label>Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input required minLength={6} type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="primary-btn" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
      </form>
      <button disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>Continue with Google</button>
      <button disabled={busy} onClick={() => { setRegister(v => !v); setMessage(''); }}>{register ? 'Already have an account? Sign in' : 'Create a new account'}</button>
      <button disabled={busy || !email.trim()} onClick={() => run(async () => { await sendPasswordResetEmail(auth, email.trim()); setMessage('If an eligible account exists, a reset email will be sent.'); })}>Reset password</button>
    </>}
    {message && <p role="status">{message}</p>}
    <button onClick={() => setDemo(true)}>Explore sample demo</button>
  </section></main>;
}
