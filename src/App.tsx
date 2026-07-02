import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { useStore } from './store/useStore';
import GooeyBackground from './components/GooeyBackground';

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
  const { prefs } = store;

  return (
    <div className={`${prefs?.darkMode ? 'dark' : 'light'} min-h-screen text-[var(--text-color)] transition-colors duration-500`}>
      <GooeyBackground />
      <Navbar />
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
