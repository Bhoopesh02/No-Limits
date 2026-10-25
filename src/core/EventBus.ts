export type EventListener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

/**
 * High-performance typed EventBus.
 *
 * Allocation notes:
 * - `emit` performs ZERO allocations in normal operation.
 * - Listener arrays are indexed with a standard for-loop to avoid iterator allocations.
 * - Listener removal during `emit` marks the slot as tombstone (`null`) and sets
 *   `pendingCompaction`, deferring array mutations until all re-entrant emits complete.
 * - In-place compaction is used to remove tombstoned entries without allocating new arrays.
 */
export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, (EventListener<unknown> | null)[]>();
  private emitDepth = 0;
  private pendingCompaction = false;

  /**
   * Subscribes a listener to the specified event.
   * Returns an unsubscribe function for convenience.
   */
  public on<K extends keyof Events>(event: K, handler: EventListener<Events[K]>): Unsubscribe {
    let list = this.listeners.get(event);
    if (!list) {
      list = [];
      this.listeners.set(event, list);
    }
    list.push(handler as EventListener<unknown>);

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribes a listener from the specified event.
   */
  public off<K extends keyof Events>(event: K, handler: EventListener<Events[K]>): void {
    const list = this.listeners.get(event);
    if (!list) return;

    const index = list.indexOf(handler as EventListener<unknown>);
    if (index === -1) return;

    if (this.emitDepth > 0) {
      // Mark as null during active emit iteration to prevent skipping elements
      list[index] = null;
      this.pendingCompaction = true;
    } else {
      list.splice(index, 1);
      if (list.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emits an event with the provided payload to all registered listeners.
   * Guarantees zero heap allocations per call.
   */
  public emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return;

    this.emitDepth++;
    const count = list.length;
    for (let i = 0; i < count; i++) {
      const handler = list[i];
      if (handler !== null) {
        (handler as EventListener<Events[K]>)(payload);
      }
    }
    this.emitDepth--;

    if (this.emitDepth === 0 && this.pendingCompaction) {
      this.compact();
    }
  }

  /**
   * Returns the count of active listeners for an event (excluding null tombstones).
   */
  public listenerCount<K extends keyof Events>(event: K): number {
    const list = this.listeners.get(event);
    if (!list) return 0;
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i] !== null) count++;
    }
    return count;
  }

  /**
   * Cleans up all listeners and resets state.
   */
  public clear(): void {
    this.listeners.clear();
    this.emitDepth = 0;
    this.pendingCompaction = false;
  }

  private compact(): void {
    this.pendingCompaction = false;
    for (const [event, list] of this.listeners) {
      let writeIdx = 0;
      for (let readIdx = 0; readIdx < list.length; readIdx++) {
        const item = list[readIdx];
        if (item !== null) {
          list[writeIdx] = item;
          writeIdx++;
        }
      }
      list.length = writeIdx;
      if (writeIdx === 0) {
        this.listeners.delete(event);
      }
    }
  }
}
