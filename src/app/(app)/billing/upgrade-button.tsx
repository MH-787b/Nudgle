"use client";

interface UpgradeButtonProps {
  plan: 'starter' | 'business';
  price: number;
}

const GUMROAD_URLS: Record<string, string | undefined> = {
  starter: process.env.NEXT_PUBLIC_GUMROAD_STARTER_URL,
  business: process.env.NEXT_PUBLIC_GUMROAD_BUSINESS_URL,
};

export function UpgradeButton({ plan, price }: UpgradeButtonProps) {
  const url = GUMROAD_URLS[plan] || process.env.NEXT_PUBLIC_GUMROAD_URL || "#";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block w-full py-3 rounded-xl font-semibold transition text-center bg-brand-500 text-white hover:bg-brand-600"
    >
      Upgrade &mdash; &pound;{price}/mo
    </a>
  );
}
