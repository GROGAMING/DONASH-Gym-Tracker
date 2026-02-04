import "./globals.css";
import NavWrapper from "@/components/NavWrapper";
import { Analytics } from "@vercel/analytics/react";

export const metadata = { title: "Gym Tracker" };

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
