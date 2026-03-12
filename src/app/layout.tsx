import "./globals.css";
import NavWrapper from "@/components/NavWrapper";
import { Analytics } from "@vercel/analytics/react";
import { TEAM_NAME } from "@/lib/team";

export const metadata = { title: TEAM_NAME };

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
