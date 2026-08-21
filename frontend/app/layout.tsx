import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import DocumentTitle from "@/components/layout/DocumentTitle";
import BackButtonGuard from "@/components/layout/BackButtonGuard";
import AuthModalProvider from "@/components/auth/AuthModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

async function getRestaurantInfo(): Promise<{ name?: string; logo?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/restaurant/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : data?.results?.[0] ?? data;
    if (!first) return null;
    return { name: first.name ?? undefined, logo: first.logo ?? undefined };
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getRestaurantInfo();
  return {
    title: restaurant?.name || "Burger House",
    description: "Burger House Restaurant Management System",
    icons: { icon: "/favicon" },
  };
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: `
          if (localStorage.getItem('darkMode') === 'true') {
            document.documentElement.classList.add('dark');
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>
          <AuthModalProvider>
            <BackButtonGuard />
            <DocumentTitle />
            <NavbarWrapper />
            {children}
          </AuthModalProvider>
        </Providers>
      </body>
    </html>
  );
}
