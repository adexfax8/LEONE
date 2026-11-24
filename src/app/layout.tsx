import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LEONE — Tech for all, affordable always.", template: "%s | LEONE" },
  description: "Laptops, smartphones, gaming and accessories. We buy, we sell, we swap. Computer Village, Ikeja, Lagos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
