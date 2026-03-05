import "./globals.css";
import NavWrapper from "@/components/NavWrapper";
import { Analytics } from "@vercel/analytics/react";

export const metadata = { title: "Gym Tracker" };

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavWrapper />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
