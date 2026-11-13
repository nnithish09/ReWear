import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from '../components/AuthShell';
import GoogleButton from '../components/GoogleButton';
import PasswordInput from '../components/PasswordInput';
import {
  SILENT_AUTH_ERRORS,
  getAuthErrorMessage,
  loginWithGoogle,
  registerWithEmail,
} from '../services/authService';
import { validateRegistration } from '../utils/validation';

export default function Register() {
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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
    const validationErrors = validateRegistration(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      await registerWithEmail(values);
      toast.success('Account created. Welcome to ReWear!');
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
      title="Create your account"
      subtitle="Start cataloguing your wardrobe in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-clay-dark hover:underline">
            Sign in
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
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            autoComplete="name"
            value={values.name}
            onChange={setField('name')}
            placeholder="Your name"
            className={`input ${errors.name ? 'input-error' : ''}`}
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

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
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">Confirm password</label>
          <PasswordInput
            id="confirmPassword"
            value={values.confirmPassword}
            onChange={setField('confirmPassword')}
            error={errors.confirmPassword}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" disabled={submitting || googleLoading} className="btn-primary w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <GoogleButton onClick={handleGoogle} loading={googleLoading} disabled={submitting} />
      </form>
    </AuthShell>
  );
}
