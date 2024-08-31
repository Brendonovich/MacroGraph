/* tslint:disable */
/* eslint-disable */
/**
* @param {string} regex
* @returns {CaptureScope}
*/
export function get_capture_groups(regex: string): CaptureScope;
/**
*/
export class CaptureGroup {
  free(): void;
/**
* @returns {string}
*/
  name(): string;
/**
* @returns {boolean}
*/
  optional(): boolean;
}
/**
*/
export class CaptureScope {
  free(): void;
/**
* @returns {(CaptureScope)[]}
*/
  scope(): (CaptureScope)[];
/**
* @returns {CaptureGroup | undefined}
*/
  capture(): CaptureGroup | undefined;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly get_capture_groups: (a: number, b: number, c: number) => void;
  readonly __wbg_capturescope_free: (a: number, b: number) => void;
  readonly capturescope_scope: (a: number, b: number) => void;
  readonly capturescope_capture: (a: number) => number;
  readonly __wbg_capturegroup_free: (a: number, b: number) => void;
  readonly capturegroup_name: (a: number, b: number) => void;
  readonly capturegroup_optional: (a: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
