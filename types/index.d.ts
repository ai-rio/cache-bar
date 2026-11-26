export type CacheMark = { at: number; ttlMs: number; isAssumed: boolean }

declare module 'claude-code' {
  interface PluginState {
    'cache-bar': {
      cache: CacheMark | null
      now: number
      isBusy: boolean
      original: string | null
    }
  }
}
