export type ThemeMode = 'light' | 'dark' | 'system'
export type LayoutMode = 'both' | 'editor-only' | 'preview-only'

export interface AppState {
  content: string
  theme: ThemeMode
  layout: LayoutMode
  splitRatio: number
  updatedAt: number
}

const STORAGE_KEY = 'md-editor:v1'

const DEFAULT_STATE: Omit<AppState, 'content' | 'updatedAt'> = {
  theme: 'system',
  layout: 'both',
  splitRatio: 0.48,
}

export function loadState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<AppState>
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function createInitialState(content: string, patch?: Partial<AppState>): AppState {
  return {
    content,
    ...DEFAULT_STATE,
    ...patch,
    updatedAt: Date.now(),
  }
}
