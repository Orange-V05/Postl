import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { logAuthFailure, translateFirebaseAuthError } from '../utils/authErrors';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firebaseConfigError } from '../firebase';

const ease = [0.22, 1, 0.36, 1] as const;

const inputClass =
  'h-11 w-full rounded-lg border bg-[var(--surface)] px-3.5 text-[15px] text-[var(--text-color)] placeholder:text-[var(--faint-color)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const emailInvalid = email.length > 0 && !isValidEmail(email);

  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase', met: /[A-Z]/.test(password) },
  ];
  const strengthScore = passwordChecks.filter((c) => c.met).length;
  const strengthLabel = strengthScore === 0 ? 'Too short' : strengthScore === 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : 'Strong';
  const strengthColor =
    strengthScore === 1 ? 'bg-[var(--danger)]' : strengthScore === 2 ? 'bg-[var(--accent-warm)]' : 'bg-[var(--accent-primary)]';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (!auth) throw new Error(firebaseConfigError || 'Firebase authentication is not configured.');
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      navigate('/dashboard');
    } catch (error: any) {
      const code = error?.code;
      if (code === 'auth/email-already-in-use') setError('This email is already registered. Try logging in.');
      else if (code === 'auth/weak-password') setError('That password is too weak. Use at least 6 characters.');
      else {
        const translated = translateFirebaseAuthError(error);
        logAuthFailure('signup', translated);
        setError(translated.message);
      }
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

        <h1 className="text-2xl font-medium tracking-tight text-[var(--text-color)]">Create your account</h1>
        <p className="mt-2 text-sm text-[var(--muted-color)]">An email and a password is all it takes.</p>

        {error && (
          <div
            id="signup-error"
            role="alert"
            aria-live="assertive"
            className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="mt-8 space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="signup-email" className="text-sm text-[var(--text-color)]">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              aria-describedby={error ? 'signup-error' : undefined}
              aria-invalid={emailInvalid}
              aria-required="true"
              className={`${inputClass} ${emailInvalid ? 'border-danger/50' : 'border-[var(--hairline-strong)] focus:border-[var(--accent-primary)]'}`}
              required
            />
            {emailInvalid && <p className="text-xs text-[var(--danger)]">That doesn't look like an email address.</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-password" className="text-sm text-[var(--text-color)]">Password</label>
            <div className="relative">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                aria-describedby={error ? 'signup-error' : 'signup-password-checks'}
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

            {password && (
              <div id="signup-password-checks" className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= strengthScore ? strengthColor : 'bg-[var(--surface-2)]'}`}
                      />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs text-[var(--muted-color)]">{strengthLabel}</span>
                </div>
                <ul className="space-y-1">
                  {passwordChecks.map((check) => (
                    <li
                      key={check.label}
                      className={`flex items-center gap-2 text-xs ${check.met ? 'text-[var(--text-color)]' : 'text-[var(--faint-color)]'}`}
                    >
                      {check.met ? (
                        <Check size={12} strokeWidth={2} className="text-[var(--accent-primary)]" />
                      ) : (
                        <X size={12} strokeWidth={2} />
                      )}
                      {check.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            aria-label={loading ? 'Creating account' : 'Create account'}
            className="group mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--text-color)] text-[15px] font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight size={15} strokeWidth={1.75} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 border-t border-[var(--hairline)] pt-6 text-sm text-[var(--muted-color)]">
          Already have an account?{' '}
          <Link to="/login" aria-label="Go to Sign In" className="text-[var(--text-color)] underline decoration-[var(--hairline-strong)] underline-offset-4 transition-colors hover:decoration-[var(--text-color)]">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default SignupPage;
