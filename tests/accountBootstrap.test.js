import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureAccount } from '../functions/src/bootstrap.js';

// Models Firestore's serialized transaction commits to exercise the real helper.
test('concurrent and repeated initialization preserve a single balance grant', async () => {
  const docs = new Map();
  let queue = Promise.resolve();
  const db = {
    doc: path => path,
    runTransaction: operation => {
      const job = queue.then(() => operation({
        get: async ref => ({ exists: docs.has(ref) }),
        create: (ref, data) => { assert.ok(!docs.has(ref)); docs.set(ref, data); },
      }));
      queue = job.catch(() => {});
      return job;
    },
  };
  const results = await Promise.all(Array.from({ length: 10 }, () => ensureAccount(db, 'one', () => 'timestamp')));
  assert.equal(results.filter(result => result.created).length, 1);
  const ref = 'seasons/2026/accounts/one';
  assert.equal(docs.get(ref).cashCents, 1000000);
  docs.get(ref).cashCents = 12345;
  await ensureAccount(db, 'one', () => 'later');
  assert.equal(docs.get(ref).cashCents, 12345);
  await ensureAccount(db, 'two', () => 'later');
  assert.equal(docs.size, 2);
});
test('invalid user paths are rejected', async () => {
  await assert.rejects(ensureAccount({}, '../other', () => 0));
  await assert.rejects(ensureAccount({}, '', () => 0));
});
