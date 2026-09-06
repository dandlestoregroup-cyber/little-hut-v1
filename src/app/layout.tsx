import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Little Hut — Book the Moment",
  description: "Discover stays through the moments they can genuinely deliver.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
