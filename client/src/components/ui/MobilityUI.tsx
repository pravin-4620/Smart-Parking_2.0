import React from 'react';
import { Car, Check, MapPin, Route, ShieldCheck } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode;
}) {
  return <header className="page-heading">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>;
}

export function Panel({ children, className = '', ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={`ui-panel ${className}`} {...props}>{children}</section>;
}

export function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <span className={`status-badge status-${tone}`}><span aria-hidden="true" />{children}</span>;
}

export function SkeletonCards({ count = 3, label = 'Loading content' }: { count?: number; label?: string }) {
  return <div role="status" aria-label={label} className="skeleton-grid"><span className="sr-only">{label}</span>{Array.from({ length: count }, (_, i) => <div key={i} className="ui-panel skeleton-card" aria-hidden="true"><div className="skeleton skeleton-short" /><div className="skeleton skeleton-title" /><div className="skeleton" /><div className="skeleton skeleton-short" /></div>)}</div>;
}

export function BookingSteps({ current }: { current: 0 | 1 | 2 }) {
  return <ol className="booking-steps" aria-label="Reservation progress">{['Choose your parking', 'Review & pay', 'Ready to park'].map((label, index) => <li key={label} className={index === current ? 'is-current' : index < current ? 'is-complete' : ''} aria-current={index === current ? 'step' : undefined}><span>{index < current ? <Check size={14} /> : `0${index + 1}`}</span><strong>{label}</strong></li>)}</ol>;
}

export function MobilityIllustration() {
  return <div className="mobility-illustration" aria-hidden="true">
    <div className="illustration-road" /><div className="illustration-bays"><span>P</span><span><Car /></span><span>P</span></div>
    <div className="illustration-pin"><MapPin size={30} /></div>
    <div className="illustration-caption"><ShieldCheck size={17} /> Your space. Your schedule.</div>
  </div>;
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-layout"><aside className="auth-story">
    <div className="auth-brand"><span className="brand-mark"><Car size={24} /></span>SmartPark<span className="brand-period">.</span></div>
    <div><p className="eyebrow">A little less searching.</p><h1>More time for<br />what moves you.</h1><p>Discover a space, plan your arrival, and keep your parking in one place.</p></div>
    <MobilityIllustration />
    <div className="auth-story-footer"><Route size={17} /> Parking, made part of your journey.</div>
  </aside><main className="auth-form-region"><div className="auth-form-wrap">{children}</div><p className="auth-footnote">SmartPark · A simpler way to park</p></main></div>;
}
