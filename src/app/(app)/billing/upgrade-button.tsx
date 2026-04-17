"use client";

export function UpgradeButton() {
  const gumroadUrl = process.env.NEXT_PUBLIC_GUMROAD_URL;

  return (
    <a
      href={gumroadUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block w-full py-3 rounded-xl font-semibold transition text-center bg-brand-500 text-white hover:bg-brand-600"
    >
      Upgrade — £29/mo
    </a>
  );
}
