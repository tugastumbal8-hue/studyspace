import { Suspense, useState, type CSSProperties } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { isDark, themeStore } from '../lib/theme'
import { useStore } from '../lib/localStore'
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

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <Icon name="check" size={20} />
      </span>
      StudySpace
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
      {withLabel && (dark ? 'Tema terang' : 'Tema gelap')}
    </button>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const moreActive = secondary.some((i) => pathname.startsWith(i.to))
  const [pressed, setPressed] = useState<number | null>(null)

  // Posisi "lensa" kaca: tab aktif, atau tab yang sedang ditekan
  const primaryIndex = primary.findIndex((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))
  const activeIndex = primaryIndex >= 0 ? primaryIndex : moreActive ? primary.length : 0
  const lensIndex = pressed ?? activeIndex
  const press = (i: number) => ({
    onPointerDown: () => setPressed(i),
    onPointerUp: () => setPressed(null),
    onPointerCancel: () => setPressed(null),
    onPointerLeave: () => setPressed(null),
  })

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
                {item.label}
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
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      <nav
        className="bottomnav glass-strong"
        aria-label="Navigasi bawah"
        style={{ '--i': lensIndex } as CSSProperties}
        data-pressed={pressed !== null || undefined}
      >
        <span className="bn-lens" aria-hidden="true" />
        {primary.map((item, i) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="bn-link" {...press(i)}>
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          className={`bn-link${moreActive ? ' is-active' : ''}`}
          popoverTarget="more-menu"
          {...press(primary.length)}
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
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}