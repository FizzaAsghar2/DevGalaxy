import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Sparkles, X } from 'lucide-react'
import { useSession } from '../../auth/AuthProvider'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/#features', label: 'Features' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/galaxies', label: 'My Galaxies', protected: true },
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-violet-500/35 blur-md" />
        <span className="relative h-4 w-4 rounded-full bg-gradient-to-br from-violet-200 via-violet-400 to-indigo-600 shadow-glow-sm" />
      </span>
      <span className="font-display text-lg tracking-tight text-white">
        Dev<span className="gradient-text">Galaxy</span>
      </span>
    </Link>
  )
}

export default function Navbar() {
  const { isSignedIn, user, signIn, signUp, signOut, openProfile, mode } = useSession()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const links = LINKS.filter((link) => !link.protected || isSignedIn)

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-void-900/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive && !link.to.includes('#') ? 'text-white' : 'text-slate-400 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <>
              <button type="button" className="btn-primary" onClick={() => navigate('/create')}>
                <Sparkles className="h-4 w-4" /> Create Galaxy
              </button>
              <button
                type="button"
                onClick={() => (mode === 'clerk' ? openProfile() : navigate('/dashboard'))}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-sm text-white"
                aria-label="Account"
                title={user?.email || user?.name}
              >
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user?.name ?? 'U').charAt(0)
                )}
              </button>
              <button type="button" className="btn-ghost px-2.5" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={() => signIn('/dashboard')}>
                Sign In
              </button>
              <button type="button" className="btn-primary" onClick={() => signUp('/dashboard')}>
                Get Started
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-ghost px-2.5 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/5 bg-void-900/95 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {isSignedIn ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setOpen(false)
                    navigate('/create')
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Create Galaxy
                </button>
                <button type="button" className="btn-ghost" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-ghost" onClick={() => signIn('/dashboard')}>
                  Sign In
                </button>
                <button type="button" className="btn-primary" onClick={() => signUp('/dashboard')}>
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
