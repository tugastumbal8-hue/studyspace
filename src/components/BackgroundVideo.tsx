import { useEffect, useState } from 'react'
import { isDark, themeStore } from '../lib/theme'
import { useStore } from '../lib/localStore'

// Ubah ke false kalau video terasa berat di HP
const VIDEO_ON_MOBILE = true

type NetworkNavigator = Navigator & { connection?: { saveData?: boolean } }

export default function BackgroundVideo() {
  const theme = useStore(themeStore)
  const dark = isDark(theme)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saver = (navigator as NetworkNavigator).connection?.saveData === true
    const wide = window.matchMedia('(min-width: 768px)').matches
    setAllowed(!reduce && !saver && (wide || VIDEO_ON_MOBILE))
  }, [])

  if (!allowed) return null

  const name = dark ? 'bg-dark' : 'bg-light'

  return (
    <video
      key={name}
      className="bg-video"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={`/${name}-poster.jpg`}
      aria-hidden="true"
    >
      <source src={`/${name}.webm`} type="video/webm" />
      <source src={`/${name}.mp4`} type="video/mp4" />
    </video>
  )
}