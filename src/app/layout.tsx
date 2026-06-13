import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live Football Streams — Watch Free Online",
  description:
    "Watch football matches live in your browser. Free streams for Premier League, La Liga, Champions League, World Cup and more. HD quality, no sign-in needed.",
  keywords:
    "live football streams, watch football online, free football streaming, Premier League live, La Liga live, Champions League stream, soccer live stream, free sports tv, football HD, watch soccer free, europa league, world cup stream",
  openGraph: {
    title: "Live Football Streams",
    description: "Watch football matches live. No app, no sign-in needed.",
    type: "website",
    url: "https://livestreamhub.vercel.app",
    siteName: "LiveStream Hub",
    images: [{ url: "https://livestreamhub.vercel.app/icon.svg", width: 200, height: 200 }],
  },
  twitter: {
    card: "summary",
    title: "Live Football Streams",
    description: "Watch football live in your browser. Free, no sign-in.",
  },
  icons: { icon: "/icon.svg" },
  alternates: { canonical: "https://livestreamhub.vercel.app" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
