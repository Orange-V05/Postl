import React, { useState, useContext } from 'react';
import { FaUser, FaLock, FaRocket, FaArrowRight, FaHome, FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await auth.login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      const code = error?.code;
      if (code === 'auth/user-not-found') setError('No account found with this email.');
      else if (code === 'auth/wrong-password') setError('Incorrect password. Please try again.');
      else if (code === 'auth/too-many-requests') setError('Too many failed attempts. Please wait and try again.');
      else setError('Invalid credentials. Please try again.');
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
          animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-teal-500/10 rounded-full blur-[100px]"
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
          <h1 className="text-4xl font-black text-[var(--text-color)] tracking-tighter mb-2">Welcome Back</h1>
          <p className="text-[var(--muted-color)] font-medium italic">Your creative vision, orchestrated by AI</p>
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

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--muted-color)] ml-1">Email</label>
              <div className="relative group">
                <FaUser className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-color)] group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  aria-required="true"
                  className={`w-full bg-[var(--input-bg)] border text-[var(--text-color)] placeholder:text-[var(--muted-color)]/50 rounded-2xl py-4 pl-14 pr-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium ${
                    email && !isValidEmail(email) ? 'border-red-500/50 focus:border-red-500/50' : 'border-[var(--input-border)] focus:border-emerald-500/50'
                  }`}
                  required
                />
              </div>
              {email && !isValidEmail(email) && (
                <p className="text-[10px] text-red-400 font-medium ml-2">Please enter a valid email</p>
              )}
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
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-color)] placeholder:text-[var(--muted-color)]/50 rounded-2xl py-4 pl-14 pr-14 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
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
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              aria-label={loading ? "Signing in" : "Sign In"}
              className="w-full relative group mt-4"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className={`relative w-full py-4 bg-[var(--panel-bg)] text-[var(--text-color)] group-hover:text-white rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all duration-300 ${loading || !email || !password ? 'opacity-50' : 'group-hover:bg-transparent'}`}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </form>

          <p className="mt-8 text-center text-[var(--muted-color)] text-sm font-medium">
            New here? <Link to="/signup" aria-label="Go to Create account" className="text-emerald-400 font-bold hover:underline">Create an account</Link>
          </p>
        </div>

        <p className="mt-8 text-center text-[var(--muted-color)] text-xs font-bold uppercase tracking-widest opacity-60">
          Secured by POSTL Identity
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
