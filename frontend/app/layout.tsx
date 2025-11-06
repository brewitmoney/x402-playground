import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "x402 Playground",
  description: "A playground to try out x402 features and explore the x402 ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lexend.variable} antialiased bg-background w-full`}
      >
        <Providers>
          <div className="max-w-7xl mx-auto md:border-x border-zinc-700 p-4 md:p-6 h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
