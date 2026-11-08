import React, { Suspense, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { useStore } from './store/useStore';
import { AuthContext } from './context/AuthContext';
import { apiConfigError } from './api/client';

const Home = React.lazy(() => import('./pages/home'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Signup = React.lazy(() => import('./pages/Signup'));

const AppLoader = () => (
  <div className="grid min-h-screen place-items-center px-6" role="status" aria-live="polite">
    <div className="flex items-center gap-3 text-sm text-[var(--muted-color)]">
      <span className="h-4 w-4 rounded-full border-2 border-[var(--hairline-strong)] border-t-[var(--accent-primary)] animate-spin" />
      Loading
    </div>
  </div>
);

function App() {
  const store = useStore();
  const auth = useContext(AuthContext);
  const { prefs } = store;

  return (
    <div className={`${prefs?.darkMode ? 'dark' : 'light'} min-h-screen bg-[var(--bg-color)] text-[var(--text-color)]`}>
      <Navbar />
      {auth?.configError && (
        <div role="alert" className="relative z-50 mx-auto mt-24 w-[min(92vw,920px)] rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface)] px-5 py-4 text-sm leading-relaxed text-[var(--muted-color)]">
          <span className="font-medium text-[var(--accent-warm)]">Deployment configuration required.</span>{' '}
          Firebase environment variables are missing on this deployment. Public pages are available, but login, signup, dashboard persistence, and generation are disabled until Vercel <code className="font-mono text-[var(--text-color)]">VITE_FIREBASE_*</code> variables are configured and redeployed.
        </div>
      )}
      {apiConfigError && (
        <div role="status" className="relative z-50 mx-auto mt-4 w-[min(92vw,920px)] rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface)] px-5 py-4 text-sm leading-relaxed text-[var(--muted-color)]">
          <span className="font-medium text-[var(--text-color)]">Backend API not configured.</span>{' '}
          Generation and repurposing need a persistent backend. Set <code className="font-mono text-[var(--text-color)]">VITE_API_BASE_URL</code> in Vercel to the deployed backend URL and redeploy.
        </div>
      )}
      <Suspense fallback={<AppLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/generate"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
