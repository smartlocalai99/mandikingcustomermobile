export function createTrailingRefresh(task) {
  let current = null;
  let trailingRequested = false;

  return function refresh() {
    if (current) {
      trailingRequested = true;
      return current;
    }

    current = (async () => {
      do {
        trailingRequested = false;
        await task();
      } while (trailingRequested);
    })().finally(() => {
      current = null;
    });

    return current;
  };
}
