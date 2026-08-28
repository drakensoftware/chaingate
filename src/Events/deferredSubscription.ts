import type { Subscription } from './types';

/**
 * Builds a {@link Subscription} whose address is only known asynchronously
 * (connectors derive it from the wallet). The handle is returned right away;
 * the real subscription is created once the address resolves, and cancelling
 * before that simply prevents it from being created.
 *
 * @internal
 */
export function deferredSubscription(
  resolveAddress: Promise<string>,
  subscribeWith: (address: string) => Subscription,
): Subscription {
  let inner: Subscription | null = null;
  let cancelled = false;
  let address: string | undefined;

  const ready = resolveAddress.then((resolved) => {
    address = resolved;
    if (cancelled) return;
    inner = subscribeWith(resolved);
    return inner.ready;
  });
  ready.catch(() => {});

  return {
    get address() {
      return address;
    },
    ready,
    unsubscribe() {
      cancelled = true;
      inner?.unsubscribe();
    },
  };
}
