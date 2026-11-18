import { describe, expect, it } from 'vitest';
import { connectOnce } from '../lib/session-sync';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('connectOnce', () => {
  it('runs one connection when the same sign-in is reported twice at once', async () => {
    const sync = connectOnce();
    const d = deferred();
    let runs = 0;
    const run = () => {
      runs++;
      return d.promise;
    };
    const a = sync.connect('u1', run);
    const b = sync.connect('u1', run);
    d.resolve();
    await Promise.all([a, b]);
    expect(runs).toBe(1);
  });

  it('does not reconnect after success, e.g. when the tab regains focus', async () => {
    const sync = connectOnce();
    let runs = 0;
    await sync.connect('u1', async () => void runs++);
    await sync.connect('u1', async () => void runs++);
    expect(runs).toBe(1);
  });

  it('retries after a failure', async () => {
    const sync = connectOnce();
    await expect(sync.connect('u1', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
    let ok = false;
    await sync.connect('u1', async () => void (ok = true));
    expect(ok).toBe(true);
  });

  it('connects again after sign-out, and for a different user', async () => {
    const sync = connectOnce();
    let runs = 0;
    await sync.connect('u1', async () => void runs++);
    sync.reset();
    await sync.connect('u1', async () => void runs++);
    await sync.connect('u2', async () => void runs++);
    expect(runs).toBe(3);
  });
});
