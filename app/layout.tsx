import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. Locks the screen size and prevents annoying double-tap zooming on mobile
export const viewport: Viewport = {
  themeColor: "#E8B4B8", // Matches your manifest!
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};

// 2. Tells Apple to treat this as a real app and hides the Safari URL bar
export const metadata: Metadata = {
  title: "Gym Tracker",
  description: "A minimalist, private workout and progression tracker.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default", 
    title: "GymTracker",
  },
  formatDetection: {
    telephone: false, // Stops iOS from turning your "3 x 10" sets into clickable phone numbers
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
