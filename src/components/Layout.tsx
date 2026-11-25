import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isDark, themeStore } from '../lib/theme'
import { useStore } from '../lib/localStore'
import { checkAndNotifyTasks } from '../lib/notifications'
import { Icon, type IconName } from './Icon'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const primary: NavItem[] = [
  { to: '/', label: 'Beranda', icon: 'home' },
  { to: '/tugas', label: 'Tugas', icon: 'check' },
  { to: '/jadwal', label: 'Jadwal', icon: 'calendar' },
  { to: '/catatan', label: 'Catatan', icon: 'note' },
]

const secondary: NavItem[] = [
  { to: '/progres', label: 'Progres', icon: 'chart' },
  { to: '/matkul', label: 'Mata kuliah', icon: 'book' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
]

const TAB_COUNT = primary.length + 1 // 4 tab + "Lainnya"
const DRAG_THRESHOLD = 6

function Brand() {
  return (
    <div className="brand">
      <img className="brand-logo" src="/logo.png" alt="" width={32} height={32} />
      <span className="brand-text">Study Productivity</span>
    </div>
  )
}

function ThemeButton({ withLabel }: { withLabel?: boolean }) {
  const theme = useStore(themeStore)
  const dark = isDark(theme)
  return (
    <button
      type="button"
      className={withLabel ? 'btn btn-ghost nav-link' : 'icon-btn'}
      aria-label={dark ? 'Pakai tema terang' : 'Pakai tema gelap'}
      onClick={() => themeStore.set(dark ? 'light' : 'dark')}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
      {withLabel && <span className="nav-label">{dark ? 'Tema terang' : 'Tema gelap'}</span>}
    </button>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const moreActive = secondary.some((i) => pathname.startsWith(i.to))

  const primaryIndex = primary.findIndex((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))
  const activeIndex = primaryIndex >= 0 ? primaryIndex : moreActive ? primary.length : 0

  const navRef = useRef<HTMLElement>(null)
  // Hanya tab yang ditunjuk yang masuk state React; posisi lens ditulis langsung ke CSS
  const [lit, setLit] = useState<number | null>(null)
  const press = useRef<{ id: number; startX: number; moved: boolean } | null>(null)
  const lastIndex = useRef(-1)
  const raf = useRef(0)
  const swallowClick = useRef(false)

  useEffect(() => {
    void checkAndNotifyTasks()
  }, [])

  const locate = (clientX: number) => {
    const rect = navRef.current!.getBoundingClientRect()
    const inner = rect.width - 8
    const w = inner / TAB_COUNT
    const x = Math.min(Math.max(clientX - rect.left - 4 - w / 2, 0), inner - w)
    const i = Math.min(TAB_COUNT - 1, Math.max(0, Math.floor((clientX - rect.left - 4) / w)))
    return { x, i }
  }

  const openTab = (i: number) => {
    if (i < primary.length) navigate(primary[i].to)
    else document.getElementById('more-menu')?.showPopover()
  }

  const endDrag = () => {
    cancelAnimationFrame(raf.current)
    press.current = null
    lastIndex.current = -1
    navRef.current?.style.removeProperty('--x')
    setLit(null)
  }

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    press.current = { id: e.pointerId, startX: e.clientX, moved: false }
  }

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (!p.moved) {
      if (Math.abs(e.clientX - p.startX) < DRAG_THRESHOLD) return
      p.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const next = locate(e.clientX)

    // Posisi lens: langsung ke CSS, tanpa render ulang React
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      navRef.current?.style.setProperty('--x', `${next.x}px`)
    })

    // State React hanya berubah saat pindah tab
    if (next.i !== lastIndex.current) {
      lastIndex.current = next.i
      setLit(next.i)
      if ('vibrate' in navigator) navigator.vibrate(6)
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || !p.moved) {
      press.current = null
      return // tap biasa: klik link berjalan normal
    }
    swallowClick.current = true
    window.setTimeout(() => {
      swallowClick.current = false
    }, 80)

    const { i } = locate(e.clientX)
    // Lens langsung berhenti di tab tujuan (tidak balik dulu ke tab lama)
    if (i < primary.length || moreActive) {
      navRef.current?.style.setProperty('--i', String(i))
    }
    endDrag()
    openTab(i)
  }

  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Lewati ke konten
      </a>
      <div className="bg" aria-hidden="true" />
      <div className="shell">
        <aside className="sidebar glass">
          <Brand />
          <nav aria-label="Navigasi utama" className="nav-list">
            {[...primary, ...secondary].map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
                <Icon name={item.icon} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-foot">
            <ThemeButton withLabel />
          </div>
        </aside>

        <div className="content">
          <header className="topbar glass-strong">
            <Brand />
            <ThemeButton />
          </header>
          <main id="main" className="main" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        ref={navRef}
        className="bottomnav glass-strong"
        aria-label="Navigasi bawah"
        data-drag={lit !== null ? '' : undefined}
        style={{ '--i': activeIndex } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (swallowClick.current) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <span className="bn-lens" aria-hidden="true" />
        {primary.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={`bn-link${lit === i ? ' is-lit' : ''}`}
            draggable={false}
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          className={`bn-link${moreActive ? ' is-active' : ''}${lit === primary.length ? ' is-lit' : ''}`}
          popoverTarget="more-menu"
        >
          <Icon name="more" />
          Lainnya
        </button>
      </nav>

      <div id="more-menu" popover="auto" className="more-menu glass-strong">
        <nav aria-label="Menu lainnya" className="nav-list">
          {secondary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="nav-link"
              onClick={(e) => e.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}