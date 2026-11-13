import { useState } from 'react';
import { Shirt, Sparkles } from 'lucide-react';
import Logo from './Logo';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80';

/** Two-column layout shared by the login, register and forgot-password pages. */
export default function AuthShell({ title, subtitle, children, footer }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto w-full max-w-md animate-fade-up py-10">
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
        <p className="text-xs text-muted">© {new Date().getFullYear()} ReWear · Know what you own.</p>
      </div>

      <div className="relative hidden overflow-hidden bg-cream lg:block">
        {!imageFailed && (
          <img
            src={HERO_IMAGE}
            alt=""
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {imageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cream to-sand">
            <Shirt className="h-40 w-40 text-clay/30" strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-canvas">
          <Sparkles className="mb-3 h-6 w-6" />
          <p className="font-display text-3xl leading-snug">Every piece you own, beautifully organised.</p>
          <p className="mt-2 max-w-md text-sm text-canvas/80">
            Catalogue your clothes, find them in seconds and stop buying what you already have.
          </p>
        </div>
      </div>
    </div>
  );
}
