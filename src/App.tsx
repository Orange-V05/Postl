import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { useStore } from './store/useStore';
import GooeyBackground from './components/GooeyBackground';

// Linear imports (Removing lazy loading for absolute stability)
import Home from './pages/home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Signup from './pages/Signup';

function App() {
  const store = useStore();
  const { prefs } = store;

  return (
    <div className={`${prefs?.darkMode ? 'dark' : 'light'} min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] transition-colors duration-500`}>
      <GooeyBackground />
      <Navbar />
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
    </div>
  );
}

export default App;
