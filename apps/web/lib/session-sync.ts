/**
 * Runs one account connection per signed-in user at a time.
 *
 * Supabase can report the same sign-in more than once: from getSession(), and
 * as INITIAL_SESSION or SIGNED_IN events (after a sign-in link, or when the tab
 * regains focus). Parallel connections each tried to create the account row;
 * the loser failed and switched the app back to "Sign in" although the user
 * was signed in.
 */
export function connectOnce() {
  let current: { userId: string; promise: Promise<void> } | null = null;
  let done: string | null = null;
  return {
    /**
     * Runs `run` for this user unless a connection for them is running or has
     * succeeded. A failed connection can be retried by calling again.
     */
    connect(userId: string, run: () => Promise<void>): Promise<void> {
      if (done === userId) return Promise.resolve();
      if (current?.userId === userId) return current.promise;
      const entry = {
        userId,
        promise: run().then(
          () => {
            done = userId;
            if (current === entry) current = null;
          },
          (err: unknown) => {
            if (current === entry) current = null;
            throw err;
          },
        ),
      };
      current = entry;
      return entry.promise;
    },
    /** Forgets the connected user, after sign-out. */
    reset() {
      current = null;
      done = null;
    },
  };
}
