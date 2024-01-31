export abstract class Disposable {
  disposeListeners: Set<() => void> = new Set();

  private disposed = false;
  dispose() {
    if (this.disposed) return;

    for (const cb of this.disposeListeners) {
      cb();
    }

    this.disposed = true;
  }

  addDisposeListener(cb: () => void): () => void {
    this.disposeListeners.add(cb);

    return () => this.disposeListeners.delete(cb);
  }
}
