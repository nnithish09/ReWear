import { Shirt } from 'lucide-react';

export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-canvas">
        <Shirt className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">ReWear</span>
    </div>
  );
}
