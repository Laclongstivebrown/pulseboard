"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buildCashflowForecast } from "@/lib/forecast";
import { formatCurrency } from "@/lib/format";
import { usePulseboard } from "@/lib/store";
import { TransactionDialog } from "./transaction-dialog";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Activity, shortcut: "1" },
  { href: "/transactions", label: "Ledger", icon: ArrowLeftRight, shortcut: "2" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "3" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    state,
    hydrated,
    referenceDate,
    addTransaction,
    toggleTheme,
  } = usePulseboard();

  const [newDialogOpen, setNewDialogOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const forecast = React.useMemo(
    () =>
      buildCashflowForecast({
        transactions: state.transactions,
        settings: state.settings,
        scenario: state.scenario,
        referenceDate,
      }),
    [state.transactions, state.settings, state.scenario, referenceDate]
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setNewDialogOpen(true);
        return;
      }

      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "1") router.push("/");
      else if (event.key === "2") router.push("/transactions");
      else if (event.key === "3") router.push("/settings");
      else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNewDialogOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30 transition-transform group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-4.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 13h4l2.5-6 4 11 2.5-5H21" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">
                Pulseboard
              </div>
              <div className="max-w-[130px] truncate text-[11px] text-muted-foreground">
                {state.settings.businessName}
              </div>
            </div>
          </Link>
        </div>

        <Button
          onClick={() => {
            setMobileNavOpen(false);
            setNewDialogOpen(true);
          }}
          className="w-full justify-between"
          size="sm"
        >
          <span className="flex items-center gap-1.5">
            <Plus className="size-3.5" />
            New entry
          </span>
          <kbd className="rounded bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[10px]">
            N
          </kbd>
        </Button>

        <nav aria-label="Primary navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  {item.label}
                </span>
                <span className="flex items-center gap-1.5">
                  {item.href === "/transactions" &&
                    forecast.summary.overdueCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-4 px-1.5 font-mono text-[10px]"
                      >
                        {forecast.summary.overdueCount}
                      </Badge>
                    )}
                  <kbd className="hidden font-mono text-[10px] text-muted-foreground/70 lg:inline">
                    {item.shortcut}
                  </kbd>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-sidebar-border pt-4">
        <div className="rounded-xl border border-border bg-card/70 p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Cash runway</span>
            <span className="font-mono text-primary">
              {hydrated
                ? forecast.summary.runwayDays !== null
                  ? `${forecast.summary.runwayDays}d`
                  : "∞"
                : "—"}
            </span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {hydrated
              ? formatCurrency(
                  forecast.summary.cashOnHand,
                  state.settings.currency
                )
              : "$—"}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Burn ~
            {hydrated
              ? formatCurrency(
                  forecast.summary.monthlyBurnEstimate,
                  state.settings.currency
                )
              : "$—"}
            /mo
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground">
            Theme
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label={`Switch to ${state.settings.theme === "dark" ? "light" : "dark"} mode`}
          >
            {state.settings.theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon-sm" aria-label="Open navigation" />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              {navContent}
            </SheetContent>
          </Sheet>
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Pulseboard
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {state.settings.theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
          <Button size="sm" onClick={() => setNewDialogOpen(true)}>
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>
      </header>

      {/* Desktop Rail */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:block lg:h-screen">
        {navContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      <TransactionDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onSave={(input) => addTransaction(input)}
      />
    </div>
  );
}
