"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BudgetAlert } from "@/lib/forecast";

export function AlertsBanner({ alerts }: { alerts: BudgetAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-2.5">
      {alerts.map((alert) => {
        const isCritical = alert.severity === "critical";
        const isWarning = alert.severity === "warning";

        const toneClasses = isCritical
          ? "border-rose-500/30 bg-rose-500/8 text-foreground"
          : isWarning
            ? "border-amber-500/30 bg-amber-500/8 text-foreground"
            : "border-emerald-500/25 bg-emerald-500/8 text-foreground";

        const Icon = isCritical
          ? Flame
          : isWarning
            ? AlertTriangle
            : CheckCircle2;

        const iconTone = isCritical
          ? "text-rose-500"
          : isWarning
            ? "text-amber-500"
            : "text-emerald-500";

        return (
          <div
            key={alert.id}
            className={`flex flex-col justify-between gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${toneClasses}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 size-4 shrink-0 ${iconTone}`} />
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-snug">{alert.title}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.description}
                </p>
              </div>
            </div>

            {alert.actionHref && alert.actionLabel && (
              <Button
                variant="outline"
                size="xs"
                className="shrink-0 self-start sm:self-center"
                render={<Link href={alert.actionHref} />}
              >
                {alert.actionLabel}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
