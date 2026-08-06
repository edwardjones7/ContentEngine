'use client';
import { useFormStatus } from 'react-dom';

// Submit button that shows a pulsing working-state while its parent form's
// server action runs (AI renders take seconds to minutes — the user needs to
// see something happening). Must be rendered inside the <form>.
export function SubmitButton({
  children,
  busy,
  className,
  title,
}: {
  children: React.ReactNode;
  busy: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} title={title} disabled={pending} aria-busy={pending}>
      {pending ? <span className="busy">{busy}</span> : children}
    </button>
  );
}
