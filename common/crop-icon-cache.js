// Keep native filesystem APIs outside this module so recovery can be tested.
export function createCropIconCache(store) {
  const pending = new Map();
  return function getIcon(key, refresh = false) {
    if (pending.has(key)) return pending.get(key);
    const work = (async () => {
      if (refresh) await store.remove(key);
      const cached = await store.read(key);
      return cached || await store.download(key);
    })();
    pending.set(key, work);
    work.finally(() => pending.delete(key)).catch(() => {});
    return work;
  };
}
