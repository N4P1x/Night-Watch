import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Leaks from './pages/Leaks'
import ThreatActors from './pages/ThreatActors'
import IOCs from './pages/IOCs'
import Sources from './pages/Sources'
import Alerts from './pages/Alerts'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <ErrorBoundary label="shell">
            <Layout />
          </ErrorBoundary>
        </ProtectedRoute>
      }>
        <Route index element={<ErrorBoundary label="dashboard"><Dashboard /></ErrorBoundary>} />
        <Route path="leaks" element={<ErrorBoundary label="leaks"><Leaks /></ErrorBoundary>} />
        <Route path="actors" element={<ErrorBoundary label="actors"><ThreatActors /></ErrorBoundary>} />
        <Route path="iocs" element={<ErrorBoundary label="iocs"><IOCs /></ErrorBoundary>} />
        <Route path="sources" element={<ErrorBoundary label="sources"><Sources /></ErrorBoundary>} />
        <Route path="alerts" element={<ErrorBoundary label="alerts"><Alerts /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary label="settings"><Settings /></ErrorBoundary>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <WebSocketProvider>
              <AppRoutes />
            </WebSocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
