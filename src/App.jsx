import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { LoadingState } from './components/ui/States'
import Landing from './pages/Landing'

// Everything behind auth (and the WebGL-heavy workspace) is split out of the
// landing bundle so the first paint stays fast.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateGalaxy = lazy(() => import('./pages/CreateGalaxy'))
const MyGalaxies = lazy(() => import('./pages/MyGalaxies'))
const Workspace = lazy(() => import('./pages/Workspace'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Admin = lazy(() => import('./pages/Admin'))

export default function App() {
  return (
    <Suspense fallback={<LoadingState label="Entering the galaxy…" />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Landing />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateGalaxy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/galaxies"
            element={
              <ProtectedRoute>
                <MyGalaxies />
              </ProtectedRoute>
            }
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/galaxy/demo" element={<Workspace demo />} />
        <Route
          path="/galaxy/:id"
          element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}
