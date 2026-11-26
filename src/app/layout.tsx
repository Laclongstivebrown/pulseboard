import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PulseboardProvider } from "@/lib/store";
import { AppShell } from "@/components/pulseboard/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulseboard — Freelance Cash-Flow & Tax Reserve Workspace",
  description:
    "Forecast irregular freelance income, manage invoices and recurring expenses, and monitor tax reserves in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground selection:bg-primary/20 selection:text-foreground">
        <TooltipProvider>
          <PulseboardProvider>
            <AppShell>{children}</AppShell>
          </PulseboardProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
