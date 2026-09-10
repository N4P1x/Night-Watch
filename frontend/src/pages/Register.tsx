import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { FieldError } from '../components/ui';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const ok = await register(email, username, password);
      if (ok) navigate('/');
      else setError('Registration failed. Try a different username/email.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-night-950">
      <div className="hidden lg:flex flex-col justify-between bg-night-900 border-r border-night-700 p-10 w-[440px] flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-black" strokeWidth={2.25} />
            </span>
            <span>
              <span className="block text-[14px] font-bold tracking-[0.16em] text-white">NIGHT-WATCH</span>
              <span className="block text-[11px] font-mono text-ink-500 tracking-wider">THREAT INTEL PLATFORM</span>
            </span>
          </div>
          <h2 className="mt-10 text-[28px] leading-9 font-semibold tracking-tight text-white">
            Request analyst
            <br />
            access.
          </h2>
          <p className="mt-3 text-[13.5px] leading-6 text-ink-400 max-w-[340px]">
            New accounts start as <span className="text-ink-100 font-semibold">viewer</span> (read-only). An admin can promote you to analyst.
          </p>
          <ul className="mt-8 space-y-2.5 text-[13px] text-ink-400">
            <li className="flex gap-2.5"><span className="text-brand font-mono">01</span> Viewer — dashboards, leaks, IOCs</li>
            <li className="flex gap-2.5"><span className="text-brand font-mono">02</span> Analyst — + sources, alerts triage</li>
            <li className="flex gap-2.5"><span className="text-brand font-mono">03</span> Admin — + scrape control, settings</li>
          </ul>
        </div>
        <p className="font-mono text-[11px] text-ink-500">Passwords are hashed server-side (bcrypt).</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <p className="nw-eyebrow">Register</p>
          <h1 className="nw-h1 !text-2xl mt-1">Create account</h1>
          <p className="nw-sub mt-1">Viewer by default. No email verification in self-hosted mode.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldError message={error} />
            <div>
              <label className="nw-label" htmlFor="reg-email">Email</label>
              <input id="reg-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div>
              <label className="nw-label" htmlFor="reg-user">Username</label>
              <input id="reg-user" type="text" className="input font-mono" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="nw-label" htmlFor="reg-pass">Password</label>
                <div className="relative">
                  <input id="reg-pass" type={showPw ? 'text' : 'password'} className="input pr-10" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-ink-500 hover:text-white" aria-label="Toggle password">
                    {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="nw-label" htmlFor="reg-confirm">Confirm</label>
                <input id="reg-confirm" type={showPw ? 'text' : 'password'} className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
              </div>
            </div>
            <p className="nw-hint">Min 8 characters. Use a unique password — this console can hold sensitive feeds.</p>
            <button type="submit" className="btn btn-primary w-full !py-2.5" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-500">
            Have an account?{' '}
            <Link to="/login" className="text-brand font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
