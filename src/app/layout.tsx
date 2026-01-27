import "./globals.css";
import NavWrapper from "@/components/NavWrapper";

export const metadata = { title: "Gym Tracker" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavWrapper />
        {children}
      </body>
    </html>
  );
}
