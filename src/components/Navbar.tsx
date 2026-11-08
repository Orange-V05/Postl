import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useStore } from "../store/useStore";
import { LayoutGrid, LogOut, Moon, Sun, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const Navbar: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore() || {};
  const { prefs = { darkMode: true }, setPrefs } = store;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!auth) return null;
  const { user, logout } = auth;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleDarkMode = () => {
    if (setPrefs) {
      setPrefs({ darkMode: !prefs?.darkMode });
    }
  };

  const userInitial = user?.email ? user.email[0].toUpperCase() : "U";
  const themeLabel = prefs?.darkMode ? "Switch to light mode" : "Switch to dark mode";
  const ThemeIcon = prefs?.darkMode ? Sun : Moon;

  const linkBase =
    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors duration-150";
  const linkIdle = "text-[var(--muted-color)] hover:text-[var(--text-color)] hover:bg-[var(--surface-2)]";
  const linkActive = "text-[var(--text-color)] bg-[var(--surface-2)]";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 z-[100] w-full border-b transition-colors duration-200 ${
          scrolled || mobileOpen
            ? "border-[var(--hairline)] bg-[var(--bg-color)]"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="POSTL Home" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--text-color)] font-mono text-sm font-medium text-[var(--bg-color)]">
              P
            </span>
            <span className="text-[15px] font-medium tracking-tight text-[var(--text-color)]">POSTL</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={toggleDarkMode}
              aria-label={themeLabel}
              title={themeLabel}
              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-color)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text-color)]"
            >
              <ThemeIcon size={16} strokeWidth={1.75} />
            </button>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  aria-label="Go to Dashboard"
                  className={`${linkBase} ${isActive("/dashboard") || isActive("/generate") ? linkActive : linkIdle}`}
                >
                  <LayoutGrid size={16} strokeWidth={1.75} />
                  <span>Dashboard</span>
                </Link>
                <span className="mx-2 h-5 w-px bg-[var(--hairline-strong)]" />
                <span
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-2)] text-xs font-medium text-[var(--text-color)]"
                  title={user.email ?? undefined}
                >
                  {userInitial}
                </span>
                <button onClick={handleLogout} aria-label="Logout" className={`${linkBase} ${linkIdle}`}>
                  <LogOut size={16} strokeWidth={1.75} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  aria-label="Go to Login"
                  className={`${linkBase} ${isActive("/login") ? linkActive : linkIdle}`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  aria-label="Go to Signup"
                  className="ml-1 inline-flex h-9 items-center rounded-lg bg-[var(--text-color)] px-4 text-sm font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85"
                >
                  Join Free
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleDarkMode}
              aria-label={themeLabel}
              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-color)]"
            >
              <ThemeIcon size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-color)]"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease }}
            className="fixed inset-x-0 top-16 bottom-0 z-[99] md:hidden"
          >
            <div className="absolute inset-0 bg-[var(--bg-color)]" onClick={() => setMobileOpen(false)} />
            <div className="relative space-y-1 border-b border-[var(--hairline)] px-4 pb-6 pt-2">
              {user ? (
                <>
                  <div className="mb-3 flex items-center gap-3 border-b border-[var(--hairline)] px-2 pb-4 pt-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-2)] text-sm font-medium">
                      {userInitial}
                    </span>
                    <p className="truncate text-sm text-[var(--muted-color)]">{user.email}</p>
                  </div>
                  <Link to="/dashboard" className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-[var(--text-color)] hover:bg-[var(--surface-2)]">
                    <LayoutGrid size={16} strokeWidth={1.75} /> Dashboard
                  </Link>
                  <button onClick={handleLogout} className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] text-[var(--muted-color)] hover:bg-[var(--surface-2)]">
                    <LogOut size={16} strokeWidth={1.75} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex h-11 items-center rounded-lg px-3 text-[15px] text-[var(--text-color)] hover:bg-[var(--surface-2)]">
                    Login
                  </Link>
                  <Link to="/signup" className="mt-2 flex h-11 items-center justify-center rounded-lg bg-[var(--text-color)] text-[15px] font-medium text-[var(--bg-color)]">
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
