"use client";

import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Landmark,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CashflowSummary } from "@/lib/forecast";
import { formatCurrency } from "@/lib/format";
import type { CurrencyCode } from "@/lib/schemas";

interface KpiStripProps {
  summary: CashflowSummary;
  currency: CurrencyCode;
  taxRatePercent: number;
  hydrated: boolean;
}

export function KpiStrip({
  summary,
  currency,
  taxRatePercent,
  hydrated,
}: KpiStripProps) {
  const forecastDelta =
    summary.projected90DayScenario - summary.projected90DayBaseline;
  const isPositiveDelta = forecastDelta >= 0;

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="border-border/80">
            <CardContent className="space-y-3 p-5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-7 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/80 bg-card/90 transition-colors hover:border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Cash on Hand</span>
            <Wallet className="size-4 text-primary" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(summary.cashOnHand, currency)}
            </span>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 font-mono text-[11px] text-primary"
            >
              {summary.runwayDays !== null ? `${summary.runwayDays}d runway` : "No burn"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            Est. burn {formatCurrency(summary.monthlyBurnEstimate, currency)}/mo
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/90 transition-colors hover:border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>90-Day Forecast</span>
            {isPositiveDelta ? (
              <ArrowUpRight className="size-4 text-emerald-500" />
            ) : (
              <ArrowDownRight className="size-4 text-rose-500" />
            )}
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(summary.projected90DayScenario, currency)}
            </span>
            {forecastDelta !== 0 ? (
              <Badge
                variant="outline"
                className={`font-mono text-[11px] tabular-nums ${
                  isPositiveDelta
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-500"
                }`}
              >
                {formatCurrency(forecastDelta, currency, { signed: true })}
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-mono text-[11px]">
                Baseline
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            Low point {formatCurrency(summary.lowestScenarioBalance, currency)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/90 transition-colors hover:border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Tax Reserve Target</span>
            <Landmark className="size-4 text-amber-500" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(summary.taxReserveTarget, currency)}
            </span>
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 font-mono text-[11px] text-amber-500"
            >
              {taxRatePercent}% rate
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {summary.taxReserveGap > 0
              ? `${formatCurrency(summary.taxReserveGap, currency)} remaining to set aside`
              : "Fully funded for period"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/90 transition-colors hover:border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Open Receivables</span>
            {summary.overdueCount > 0 ? (
              <Clock className="size-4 text-rose-500" />
            ) : (
              <ShieldCheck className="size-4 text-emerald-500" />
            )}
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(summary.pendingReceivables, currency)}
            </span>
            {summary.overdueCount > 0 ? (
              <Badge variant="destructive" className="font-mono text-[11px]">
                {summary.overdueCount} overdue
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-500"
              >
                All current
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {summary.overdueAmount > 0
              ? `${formatCurrency(summary.overdueAmount, currency)} awaiting collection`
              : "No overdue client invoices"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
