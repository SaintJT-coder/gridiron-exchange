// Transaction retries read the existing account; opening cash is granted once.
export async function ensureAccount(db, uid, timestamp) {
  if (typeof uid !== 'string' || !uid || uid.includes('/')) throw new Error('Invalid user');
  const ref = db.doc(`seasons/2026/accounts/${uid}`);
  return db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (!existing.exists) tx.create(ref, {
      cashCents: 1000000, openingBalanceCents: 1000000,
      accountVersion: 1, createdAt: timestamp(),
    });
    return { seasonId: '2026', created: !existing.exists };
  });
}
