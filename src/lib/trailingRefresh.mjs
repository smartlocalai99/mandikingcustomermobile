export function createTrailingRefresh(task, { delayMs = 120 } = {}) {
  let current = null;
  let trailingRequested = false;

  const delay = () =>
    delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve();

  return function refresh() {
    if (current) {
      trailingRequested = true;
      return current;
    }

    current = (async () => {
      do {
        trailingRequested = false;
        await delay();
        await task();
      } while (trailingRequested);
    })().finally(() => {
      current = null;
    });

    return current;
  };
}
