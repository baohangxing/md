import type { ThemeMode } from './storage'

export type ResolvedTheme = 'light' | 'dark'

let mediaQuery: MediaQueryList | null = null
let mode: ThemeMode = 'system'
const listeners = new Set<(theme: ResolvedTheme) => void>()

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(current: ThemeMode = mode): ResolvedTheme {
  if (current === 'system') {
    return systemPrefersDark() ? 'dark' : 'light'
  }
  return current
}

function apply(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  listeners.forEach((fn) => fn(resolved))
}

function onSystemChange(): void {
  if (mode === 'system') apply(resolveTheme('system'))
}

export function initTheme(initial: ThemeMode): ResolvedTheme {
  mode = initial
  if (!mediaQuery) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemChange)
  }
  const resolved = resolveTheme(mode)
  apply(resolved)
  return resolved
}

export function setThemeMode(next: ThemeMode): ResolvedTheme {
  mode = next
  const resolved = resolveTheme(mode)
  apply(resolved)
  return resolved
}

export function getThemeMode(): ThemeMode {
  return mode
}

export function onThemeChange(listener: (theme: ResolvedTheme) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
