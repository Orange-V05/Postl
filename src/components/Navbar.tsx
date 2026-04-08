import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useStore } from "../store/useStore";
import { FaRocket, FaSignOutAlt, FaColumns, FaMoon, FaSun, FaBars, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const Navbar: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore() || {};
  const { prefs = { darkMode: true }, setPrefs } = store;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!auth) return null;
  const { user, logout } = auth;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isHome = location.pathname === "/";
  const isActive = (path: string) => location.pathname === path;

  const toggleDarkMode = () => {
    if (setPrefs) {
      setPrefs({ darkMode: !prefs?.darkMode });
    }
  };

  // User initial avatar
  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-[100] px-4 sm:px-6 py-3 sm:py-4 pointer-events-none">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`max-w-7xl mx-auto rounded-2xl px-5 sm:px-8 py-3 flex justify-between items-center pointer-events-auto transition-all duration-500 ${
            scrolled
              ? 'glass-panel shadow-2xl border-[var(--glass-border)]'
              : isHome
                ? 'bg-transparent border border-transparent'
                : 'glass-panel border-[var(--glass-border)]'
          }`}
        >
          <Link to="/" aria-label="POSTL Home" className="flex items-center space-x-3 group">
            <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 400 }}>
              <FaRocket className="text-emerald-500 text-xl" />
            </motion.div>
            <span className="font-display font-bold text-[var(--text-color)] tracking-tighter text-xl">POSTL</span>
            <span className="hidden sm:inline-flex text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">v4</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-4">
            <motion.button
              onClick={toggleDarkMode}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={prefs?.darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="text-[var(--muted-color)] hover:text-[var(--text-color)] transition-colors p-2 rounded-xl hover:bg-[var(--input-bg)]"
            >
              {prefs?.darkMode ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />}
            </motion.button>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  aria-label="Go to Dashboard"
                  className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest transition-all px-4 py-2 rounded-xl ${
                    isActive('/dashboard') || isActive('/generate')
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : 'text-[var(--muted-color)] hover:text-[var(--text-color)] hover:bg-[var(--input-bg)]'
                  }`}
                >
                  <FaColumns className="text-emerald-500" />
                  <span>Dashboard</span>
                </Link>
                <div className="h-4 w-[1px] bg-[var(--glass-border)]" />
                
                {/* User Avatar */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/20">
                    {userInitial}
                  </div>
                  <button
                    onClick={handleLogout}
                    aria-label="Logout"
                    className="flex items-center space-x-2 text-xs font-black text-red-500/70 hover:text-red-500 uppercase tracking-widest transition-colors p-2 rounded-xl hover:bg-red-500/5"
                  >
                    <FaSignOutAlt />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" aria-label="Go to Login" className={`text-xs font-black uppercase tracking-widest transition-all px-4 py-2 rounded-xl ${
                  isActive('/login') ? 'text-emerald-500 bg-emerald-500/10' : 'text-[var(--muted-color)] hover:text-[var(--text-color)] hover:bg-[var(--input-bg)]'
                }`}>
                  Login
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/signup" aria-label="Go to Signup" className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full transition-all shadow-lg shadow-emerald-500/20">
                    Join Free
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <motion.button
              onClick={toggleDarkMode}
              whileTap={{ scale: 0.9 }}
              className="text-[var(--muted-color)] p-2"
            >
              {prefs?.darkMode ? <FaSun /> : <FaMoon />}
            </motion.button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-[var(--text-color)] p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[99] pt-24 px-6 pointer-events-auto md:hidden"
          >
            <div className="absolute inset-0 bg-[var(--bg-color)]/95 backdrop-blur-xl" onClick={() => setMobileOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-8 space-y-4 border border-[var(--glass-border)] shadow-2xl">
              {user ? (
                <>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--glass-border)]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-sm font-black">
                      {userInitial}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-color)]">{user.email}</p>
                      <p className="text-[9px] text-[var(--muted-color)] uppercase tracking-widest">Creator Account</p>
                    </div>
                  </div>
                  <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-500/10 text-[var(--text-color)] font-bold text-sm transition-all">
                    <FaColumns className="text-emerald-500" /> Dashboard
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 font-bold text-sm transition-all w-full text-left">
                    <FaSignOutAlt /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex items-center justify-center px-4 py-3 rounded-xl hover:bg-[var(--input-bg)] text-[var(--text-color)] font-bold text-sm transition-all">
                    Login
                  </Link>
                  <Link to="/signup" className="flex items-center justify-center px-4 py-4 rounded-xl bg-emerald-500 text-white font-black text-sm transition-all shadow-lg">
                    Join Free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
