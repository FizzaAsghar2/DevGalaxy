import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="pointer-events-none absolute h-56 w-56 rounded-full bg-violet-600/20 blur-[100px]" />
      <p className="relative font-display text-6xl text-white">404</p>
      <h1 className="relative mt-3 font-display text-2xl">This corner of space is empty.</h1>
      <p className="relative mt-2 text-sm text-slate-400">
        The page drifted out of orbit. Head back to a known star system.
      </p>
      <div className="relative mt-6 flex gap-2">
        <Link to="/" className="btn-primary">
          Back to home
        </Link>
        <Link to="/galaxy/demo" className="btn-ghost">
          Explore Demo
        </Link>
      </div>
    </div>
  )
}
