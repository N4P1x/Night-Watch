import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { FieldError } from '../components/ui';

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-night-900 border-r border-night-700 p-10 w-[440px] flex-shrink-0">
      <div>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-black" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-[14px] font-bold tracking-[0.16em] text-white">NIGHT-WATCH</span>
            <span className="block text-[11px] font-mono text-ink-500 tracking-wider">THREAT INTEL PLATFORM</span>
          </span>
        </div>
        <h2 className="mt-10 text-[28px] leading-9 font-semibold tracking-tight text-white">
          Dark-web posture,
          <br />
          without the noise.
        </h2>
        <p className="mt-3 text-[13.5px] leading-6 text-ink-400 max-w-[340px]">
          Ransomware leaks, actor tracking, and IOCs in one dense console built for analysts. No marketing gradients — just signal.
        </p>
        <dl className="mt-8 space-y-3 font-mono text-[12px]">
          <div className="flex justify-between border-b border-night-700 pb-2.5">
            <dt className="text-ink-500">FEEDS</dt>
            <dd className="text-ink-100">tor + clearnet</dd>
          </div>
          <div className="flex justify-between border-b border-night-700 pb-2.5">
            <dt className="text-ink-500">IOC TYPES</dt>
            <dd className="text-ink-100">17+ patterns</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">ACCESS</dt>
            <dd className="text-ink-100">admin / analyst / viewer</dd>
          </div>
        </dl>
      </div>
      <p className="font-mono text-[11px] text-ink-500">Authorized use only. All actions are logged.</p>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (ok) navigate('/');
      else setError('Invalid username or password.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-night-950">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="w-8 h-8 rounded-md bg-brand flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-black" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-bold tracking-[0.14em]">NIGHT-WATCH</span>
          </div>

          <p className="nw-eyebrow">Sign in</p>
          <h1 className="nw-h1 !text-2xl mt-1">Welcome back</h1>
          <p className="nw-sub mt-1">Use your analyst credentials. Sessions expire on logout.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldError message={error} />
            <div>
              <label className="nw-label" htmlFor="login-user">
                Username
              </label>
              <input
                id="login-user"
                name="username"
                type="text"
                className="input font-mono"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                spellCheck={false}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="nw-label" htmlFor="login-pass">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-pass"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-ink-500 hover:text-white"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeSlashIcon className="w-4 h-4" aria-hidden="true" /> : <EyeIcon className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full !py-2.5" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-500">
            No account?{' '}
            <Link to="/register" className="text-brand font-semibold hover:underline">
              Request access
            </Link>
          </p>
          <p className="mt-6 text-center font-mono text-[11px] text-ink-500">Default roles: admin sees Sources + scrape controls.</p>
        </div>
      </div>
    </div>
  );
}
