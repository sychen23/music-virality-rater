import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { AuthModal } from "@/components/auth-modal";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SoundCheck",
  description:
    "Will your track go viral? Get real listener ratings on your music across TikTok, Spotify, Radio, and Sync contexts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {process.env.NODE_ENV === "production" && (
          <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3047999567481055"
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
        <AuthProvider>
          <div className="min-h-screen pb-20">{children}</div>
          <BottomNav />
          <AuthModal />
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
