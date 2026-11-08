import React, { useState, useContext } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { logAuthFailure, translateFirebaseAuthError } from '../utils/authErrors';

const ease = [0.22, 1, 0.36, 1] as const;

export const inputClass =
  'h-11 w-full rounded-lg border bg-[var(--surface)] px-3.5 text-[15px] text-[var(--text-color)] placeholder:text-[var(--faint-color)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const emailInvalid = email.length > 0 && !isValidEmail(email);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await auth.login(email.trim(), password);
      navigate('/dashboard');
    } catch (error: any) {
      const translated = translateFirebaseAuthError(error);
      logAuthFailure('login', translated);
      setError(translated.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-16 pt-28">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease }}
        className="w-full max-w-sm"
      >
        <Link
          to="/"
          aria-label="Back to Home"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-[var(--muted-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Home
        </Link>

        <h1 className="text-2xl font-medium tracking-tight text-[var(--text-color)]">Log in to POSTL</h1>
        <p className="mt-2 text-sm text-[var(--muted-color)]">Pick up where you left off.</p>

        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-sm text-[var(--text-color)]">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={emailInvalid}
              aria-required="true"
              className={`${inputClass} ${emailInvalid ? 'border-danger/50' : 'border-[var(--hairline-strong)] focus:border-[var(--accent-primary)]'}`}
              required
            />
            {emailInvalid && <p className="text-xs text-[var(--danger)]">That doesn't look like an email address.</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm text-[var(--text-color)]">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                aria-describedby={error ? 'login-error' : undefined}
                aria-required="true"
                className={`${inputClass} border-[var(--hairline-strong)] pr-11 focus:border-[var(--accent-primary)]`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-[var(--faint-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            aria-label={loading ? 'Signing in' : 'Sign In'}
            className="group mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--text-color)] text-[15px] font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Signing in…
              </>
            ) : (
              <>
                Log in
                <ArrowRight size={15} strokeWidth={1.75} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 border-t border-[var(--hairline)] pt-6 text-sm text-[var(--muted-color)]">
          New to POSTL?{' '}
          <Link to="/signup" aria-label="Go to Create account" className="text-[var(--text-color)] underline decoration-[var(--hairline-strong)] underline-offset-4 transition-colors hover:decoration-[var(--text-color)]">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
