'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown } from 'lucide-react';
import { SiGmail, SiWhatsapp, SiGooglecalendar } from 'react-icons/si';
import { MdTextsms } from 'react-icons/md';
import Link from 'next/link';
import PixelOctopus from './pixel-octopus';

const connections = [
  {
    id: 'email',
    label: 'Email',
    Icon: SiGmail,
    color: '#EA4335',
    x: 90,
    y: 65,
    path: 'M 450,225 C 330,185 210,115 90,65',
  },
  {
    id: 'sms',
    label: 'SMS',
    Icon: MdTextsms,
    color: '#4FC3F7',
    x: 810,
    y: 65,
    path: 'M 450,225 C 570,185 690,115 810,65',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    Icon: SiWhatsapp,
    color: '#25D366',
    x: 90,
    y: 385,
    path: 'M 450,225 C 330,265 210,335 90,385',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    Icon: SiGooglecalendar,
    color: '#4285F4',
    x: 810,
    y: 385,
    path: 'M 450,225 C 570,265 690,335 810,385',
  },
];

export default function BranchHero() {
  const [businessName, setBusinessName] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = businessName.trim()
      ? `?business=${encodeURIComponent(businessName.trim())}`
      : '';
    router.push(`/signup${params}`);
  };

  return (
    <section className="h-[100dvh] flex flex-col bg-surface-900 relative overflow-hidden">
      {/* Background glow */}
      <div className="hero-glow absolute inset-0 pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10 px-4 sm:px-8 py-5 flex items-center justify-between max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-500" strokeWidth={2} />
          <span className="text-xl font-bold tracking-tight text-white">nudgle</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-surface-600 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 active:scale-[0.98] transition-all"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="animate-in text-center mb-8">
          {/* Pixel octopus mascot */}
          <div className="flex justify-center mb-6">
            <PixelOctopus size={6} />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-white leading-[1.1]">
            Meet Nudgle: the AI booking agent
          </h1>
          <p className="mt-4 text-surface-600 text-base sm:text-lg max-w-[48ch] mx-auto leading-relaxed">
            Sends reminders, chases confirmations, and fills your calendar &mdash; so you can focus on what you&apos;re great at. No tech skills needed.
          </p>
        </div>

        {/* === Desktop: branch container === */}
        <div
          className="branch-container relative w-full max-w-4xl mx-auto hidden md:block animate-in delay-1"
          style={{ aspectRatio: '2 / 1' }}
        >
          {/* SVG branch paths */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 900 450"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
          >
            {connections.map((c, i) => (
              <path
                key={c.id}
                className={`branch-path branch-path-${i + 1}`}
                d={c.path}
                stroke="var(--color-brand-500)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                pathLength="1"
              />
            ))}
          </svg>

          {/* Connection nodes */}
          {connections.map((c, i) => (
            <div
              key={c.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                top: `${(c.y / 450) * 100}%`,
                left: `${(c.x / 900) * 100}%`,
              }}
            >
              <div
                className={`branch-node branch-node-${i + 1} flex items-center gap-2.5 px-4 py-2.5 bg-surface-100 border border-surface-300 rounded-xl`}
              >
                <c.Icon className="w-4 h-4 shrink-0" style={{ color: c.color }} />
                <span className="text-sm text-surface-600 font-medium whitespace-nowrap">
                  {c.label}
                </span>
              </div>
            </div>
          ))}

          {/* Centered search-bar input */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <form
              onSubmit={handleSubmit}
              className="hero-input-form flex items-center w-full max-w-lg bg-surface-100 border border-surface-300 rounded-2xl p-2 pl-5 shadow-2xl"
            >
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name..."
                className="flex-1 bg-transparent outline-none text-white placeholder:text-surface-500 text-lg min-w-0"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                Get started
              </button>
            </form>
          </div>
        </div>

        {/* === Mobile: simple input + icon row === */}
        <div className="md:hidden w-full max-w-lg animate-in delay-1">
          <form
            onSubmit={handleSubmit}
            className="flex items-center bg-surface-100 border border-surface-300 rounded-2xl p-2 pl-5 shadow-2xl"
          >
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter your business name..."
              className="flex-1 bg-transparent outline-none text-white placeholder:text-surface-500 text-base min-w-0"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 active:scale-[0.98] transition-all whitespace-nowrap text-sm"
            >
              Get started
            </button>
          </form>
          <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-1.5 text-xs text-surface-500"
              >
                <c.Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 animate-in delay-2">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-surface-100 border border-brand-500 text-white text-base font-semibold rounded-xl hover:bg-surface-200 active:scale-[0.98] transition-all"
          >
            Start your free 14-day trial
          </Link>
          <p className="text-sm text-surface-500 font-mono">
            No credit card required &middot; Setup in 60 seconds
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex justify-center pb-8">
        <ChevronDown className="w-5 h-5 text-surface-500 animate-bounce" />
      </div>
    </section>
  );
}
