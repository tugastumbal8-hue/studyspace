import { useEffect, useState, type CSSProperties } from 'react'

export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Study Productivity`
  }, [title])
}

export const cssVars = (vars: Record<string, string>) => vars as CSSProperties
