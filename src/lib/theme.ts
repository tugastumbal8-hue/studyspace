import { createLocalStore } from './localStore'

export type Theme = 'auto' | 'light' | 'dark'

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
}

export const themeStore = createLocalStore<Theme>('studyspace.theme', 'auto', apply)

export function isDark(theme: Theme) {
  return theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
}
