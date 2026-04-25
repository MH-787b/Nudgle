import type { Metadata } from "next";
import "./globals.css";
import { LoadingBar } from "@/components/loading-bar";

export const metadata: Metadata = {
  title: "Nudgle - Stop Losing Money From Missed Appointments",
  description: "Automatically remind your customers so they show up. Set up in 60 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-900 text-surface-50 antialiased">
        <LoadingBar />
        {children}
      </body>
    </html>
  );
}
