import React, { useState } from 'react';
import { FaLock, FaEnvelope, FaRocket, FaArrowRight, FaHome, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // Password strength
  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase', met: /[A-Z]/.test(password) },
  ];
  const strengthScore = passwordChecks.filter(c => c.met).length;
  const strengthLabel = strengthScore === 0 ? '' : strengthScore === 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : 'Strong';
  const strengthColor = strengthScore === 1 ? 'bg-red-500' : strengthScore === 2 ? 'bg-amber-500' : strengthScore === 3 ? 'bg-emerald-500' : 'bg-[var(--input-border)]';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error: any) {
      const code = error?.code;
      if (code === 'auth/email-already-in-use') setError('This email is already registered. Try logging in.');
      else if (code === 'auth/weak-password') setError('Password is too weak. Use at least 6 characters.');
      else setError(error.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center p-6 selection:bg-emerald-500/30">
      <Link
        to="/"
        aria-label="Back to Home"
        className="absolute top-28 left-6 sm:left-8 p-3 sm:p-4 glass-panel rounded-2xl text-[var(--text-color)] hover:text-emerald-400 transition-all flex items-center gap-2 group z-50"
      >
        <FaHome className="group-hover:scale-110 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest hidden md:block">Back Home</span>
      </Link>

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[10%] w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[15%] right-[10%] w-72 h-72 bg-cyan-500/8 rounded-full blur-[90px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl shadow-xl shadow-emerald-500/20 mb-6"
          >
            <FaRocket className="text-white text-3xl" />
          </motion.div>
          <h1 className="text-4xl font-black text-[var(--text-color)] tracking-tighter mb-2 uppercase">Join POSTL</h1>
          <p className="text-[var(--muted-color)] font-medium italic">Begin your journey into AI content mastery</p>
        </div>

        <div className="glass-panel p-8 sm:p-10 rounded-[2.5rem] border-[var(--glass-border)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              aria-live="assertive"
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--muted-color)] ml-1">Email</label>
              <div className="relative group">
                <FaEnvelope className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-color)] group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="email"
                  placeholder="creator@postl.ai"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  aria-required="true"
                  className={`w-full bg-[var(--input-bg)] border rounded-2xl py-4 pl-14 pr-5 text-[var(--text-color)] placeholder:text-[var(--muted-color)]/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium ${
                    email && !isValidEmail(email) ? 'border-red-500/50 focus:border-red-500/50' : 'border-[var(--input-border)] focus:border-emerald-500/50'
                  }`}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--muted-color)] ml-1">Password</label>
              <div className="relative group">
                <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-color)] group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  aria-required="true"
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-2xl py-4 pl-14 pr-14 text-[var(--text-color)] placeholder:text-[var(--muted-color)]/50 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted-color)] hover:text-[var(--text-color)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strengthScore ? strengthColor : 'bg-[var(--input-border)]'}`} />
                      ))}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${strengthScore === 3 ? 'text-emerald-500' : strengthScore === 2 ? 'text-amber-500' : 'text-red-500'}`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {passwordChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {check.met ? (
                          <FaCheck className="text-emerald-500" size={8} />
                        ) : (
                          <FaTimes className="text-[var(--muted-color)]" size={8} />
                        )}
                        <span className={`text-[10px] font-medium ${check.met ? 'text-emerald-500' : 'text-[var(--muted-color)]'}`}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              aria-label={loading ? "Creating account" : "Create account"}
              className="w-full relative group mt-4"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className={`relative w-full py-4 bg-[var(--panel-bg)] rounded-2xl font-bold text-[var(--text-color)] group-hover:text-white flex items-center justify-center space-x-2 transition-all duration-300 ${loading || !email || !password ? 'opacity-50' : 'group-hover:bg-transparent'}`}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <>
                    <span>Create Account</span>
                    <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </form>

          <p className="mt-8 text-center text-[var(--muted-color)] text-sm font-medium">
            Already have an account? <Link to="/login" aria-label="Go to Sign In" className="text-emerald-400 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
