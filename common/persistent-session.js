import { ApiError, endpoints } from "./api.js";

// Storage and transport are supplied by the platform; only credentials are persisted.
export function createPersistentSession({ read, write, send }) {
  let tokens = null;
  let refreshing = null;
  let generation = 0;
  let writes = Promise.resolve();
  const listeners = new Set();
  const persist = value => {
    writes = writes.catch(() => {}).then(() => write(value));
    return writes;
  };
  const notify = () => listeners.forEach(listener => listener(tokens?.accessToken || ""));
  async function save(next) {
    const version = generation;
    if (!next?.accessToken || !next?.refreshToken) throw Error("Session credentials were not returned. Update the server and try again.");
    await persist(next);
    if (version !== generation) return;
    tokens = next;
    notify();
  }
  async function clear() {
    generation++;
    tokens = null;
    notify();
    await persist(null);
  }
  async function refresh() {
    if (refreshing) return refreshing;
    if (!tokens?.refreshToken) throw new ApiError("Please sign in again.", 401);
    const version = generation;
    const refreshToken = tokens.refreshToken;
    refreshing = (async () => {
      try {
        const next = await send(endpoints.refresh, "", {
          method: "POST", body: JSON.stringify({ refreshToken }),
        });
        if (version !== generation) throw new ApiError("Session ended.", 401);
        await save(next);
        if (version !== generation) throw new ApiError("Session ended.", 401);
        return next.accessToken;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && version === generation) await clear();
        throw error;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function restore() {
    const saved = await read();
    if (!saved?.accessToken || !saved?.refreshToken) return "";
    tokens = saved;
    notify();
    try { await refresh(); }
    catch (error) {
      // Connection failures retain the session for the next request/relaunch.
      if (error instanceof ApiError && error.status === 401) return "";
    }
    return tokens?.accessToken || "";
  }
  async function request(path, token = "", options = {}) {
    const version = generation;
    const authenticated = Boolean(token);
    const usedToken = authenticated ? tokens?.accessToken || token : "";
    try { return await send(path, usedToken, options); }
    catch (error) {
      if (!authenticated || !(error instanceof ApiError) || error.status !== 401 || !tokens?.refreshToken) throw error;
      // Another request may already have renewed this access token.
      const next = tokens.accessToken !== usedToken ? tokens.accessToken : await refresh();
      if (version !== generation) throw new ApiError("Session ended.", 401);
      return send(path, next, options);
    }
  }
  return { save, clear, restore, request, subscribe(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  } };
}
