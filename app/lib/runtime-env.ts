type RuntimeBindings = Record<string, unknown>;

declare global {
  var __EG_RUNTIME_BINDINGS__: RuntimeBindings | undefined;
}

export function installRuntimeBindings(bindings: RuntimeBindings) {
  globalThis.__EG_RUNTIME_BINDINGS__ = bindings;
}

export function runtimeBinding<T>(key: string) {
  return globalThis.__EG_RUNTIME_BINDINGS__?.[key] as T | undefined;
}

export function runtimeValue(key: string) {
  const injected = runtimeBinding<unknown>(key);
  if (typeof injected === "string") return injected;
  return typeof process !== "undefined" ? process.env[key] : undefined;
}
