import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from '../components/AuthShell';
import GoogleButton from '../components/GoogleButton';
import PasswordInput from '../components/PasswordInput';
import {
  SILENT_AUTH_ERRORS,
  getAuthErrorMessage,
  loginWithEmail,
  loginWithGoogle,
} from '../services/authService';
import { validateLogin } from '../utils/validation';

export default function Login() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const setField = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateLogin(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      await loginWithEmail({ ...values, remember });
      toast.success('Welcome back!');
      // PublicRoute redirects as soon as the auth state updates.
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setFormError('');
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google.');
    } catch (error) {
      if (!SILENT_AUTH_ERRORS.includes(error.code)) setFormError(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to open your wardrobe."
      footer={
        <>
          New to ReWear?{' '}
          <Link to="/register" className="font-medium text-clay-dark hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-xl border border-blush bg-blush-soft px-4 py-3 text-sm text-[#8A4B45]">
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={setField('email')}
            placeholder="you@example.com"
            className={`input ${errors.email ? 'input-error' : ''}`}
          />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <PasswordInput
            id="password"
            value={values.password}
            onChange={setField('password')}
            error={errors.password}
            placeholder="Your password"
            autoComplete="current-password"
          />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-line accent-[#2B2926]"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-clay-dark hover:underline">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={submitting || googleLoading} className="btn-primary w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <GoogleButton onClick={handleGoogle} loading={googleLoading} disabled={submitting} />
      </form>
    </AuthShell>
  );
}
