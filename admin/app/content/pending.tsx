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

// Tag-chip submit: disables its form while pending and pulses only the chip
// that was actually clicked (the submitter's value rides in useFormStatus data).
export function ChipSubmit({
  value,
  chipClass,
  title,
  children,
}: {
  value: string;
  chipClass: string;
  title?: string;
  children: React.ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get('value') === value;
  return (
    <button type="submit" name="value" value={value} title={title} disabled={pending} aria-busy={mine}
      style={{ padding: 0, border: 'none', background: 'none' }}>
      <span className={chipClass + (mine ? ' busy-chip' : '')}>{children}</span>
    </button>
  );
}
