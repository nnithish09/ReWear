import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl text-clay/40">404</p>
      <h1 className="mt-2 text-3xl">This page is out of fashion</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary mt-6">
        <Home className="h-4 w-4" /> Back to dashboard
      </Link>
    </div>
  );
}
