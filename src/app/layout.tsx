
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";

import { Navigation } from "@/components/navigation";
import { AuthProvider } from "@/contexts/auth-context";
import { MovieCollectionProvider } from "@/contexts/movie-collection-context";
import { AddMovieProvider } from "@/contexts/add-movie-context";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { AddMovieDrawer } from "@/components/add-movie-drawer";
import { NavigationProgress } from "@/components/navigation-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie Collection",
  description: "Your personal cinema archive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-screen bg-background text-foreground">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AuthProvider>
          <MovieCollectionProvider>
            <AddMovieProvider>
              <NotificationsProvider>
                <div className="flex min-h-screen flex-col">
                  <Suspense
                    fallback={
                      <div className="h-14 border-b border-[#131D2A] bg-[#070C13]" />
                    }
                  >
                    <Navigation />
                  </Suspense>

                  <main className="min-w-0 flex-1">
                    {children}
                  </main>
                </div>
                <AddMovieDrawer />
              </NotificationsProvider>
            </AddMovieProvider>
          </MovieCollectionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
