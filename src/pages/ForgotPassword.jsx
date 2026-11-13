import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { getAuthErrorMessage, resetPassword } from '../services/authService';
import { validateEmail } from '../utils/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateEmail(email);
    setError(validationError);
    if (validationError) return;

    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (resetError) {
      // Don't reveal whether an account exists for this address.
      if (resetError.code === 'auth/user-not-found') setSent(true);
      else setError(getAuthErrorMessage(resetError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-clay-dark hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="card animate-fade-up p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-sage" />
          <h2 className="text-xl">Check your inbox</h2>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <span className="font-medium text-ink">{email.trim()}</span>, a
            password reset link is on its way. Check your spam folder too.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              placeholder="you@example.com"
              className={`input ${error ? 'input-error' : ''}`}
            />
            {error && <p className="field-error" role="alert">{error}</p>}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
