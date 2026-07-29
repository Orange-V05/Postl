import React, { Suspense, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { useStore } from './store/useStore';
import GooeyBackground from './components/GooeyBackground';
import { AuthContext } from './context/AuthContext';
import { apiConfigError } from './api/client';

const Home = React.lazy(() => import('./pages/home'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Signup = React.lazy(() => import('./pages/Signup'));

const AppLoader = () => (
  <div className="grid min-h-screen place-items-center px-6 pt-24">
    <div className="premium-card w-full max-w-sm rounded-[2rem] p-8 text-center">
      <div className="mx-auto mb-5 h-14 w-14 animate-pulse rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 shadow-2xl shadow-emerald-500/25" />
      <p className="font-display text-sm font-black uppercase tracking-[0.35em] text-[var(--text-color)]">Booting POSTL</p>
      <p className="mt-2 text-xs font-medium text-[var(--muted-color)]">Loading the creator command center...</p>
    </div>
  </div>
);

function App() {
  const store = useStore();
  const auth = useContext(AuthContext);
  const { prefs } = store;

  return (
    <div className={`${prefs?.darkMode ? 'dark' : 'light'} min-h-screen text-[var(--text-color)] transition-colors duration-500`}>
      <GooeyBackground />
      <Navbar />
      {auth?.configError && (
        <div role="alert" className="relative z-50 mx-auto mt-24 w-[min(92vw,920px)] rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-100 shadow-2xl shadow-amber-500/10">
          <span className="font-black uppercase tracking-widest text-amber-300">Deployment configuration required:</span>{' '}
          Firebase environment variables are missing on this deployment. Public pages are available, but login, signup, dashboard persistence, and generation are disabled until Vercel `VITE_FIREBASE_*` variables are configured and redeployed.
        </div>
      )}
      {apiConfigError && (
        <div role="status" className="relative z-50 mx-auto mt-4 w-[min(92vw,920px)] rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-4 text-sm font-semibold text-cyan-100 shadow-2xl shadow-cyan-500/10">
          <span className="font-black uppercase tracking-widest text-cyan-300">Backend API not configured:</span>{' '}
          Generation and repurposing need a persistent backend. Set `VITE_API_BASE_URL` in Vercel to the deployed backend URL and redeploy.
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
