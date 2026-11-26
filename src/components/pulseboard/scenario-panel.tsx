"use client";

import * as React from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import type { CurrencyCode, ScenarioConfig } from "@/lib/schemas";
import { DEFAULT_SCENARIO } from "@/lib/seed";

interface ScenarioPanelProps {
  scenario: ScenarioConfig;
  currency: CurrencyCode;
  baseline90: number;
  scenario90: number;
  onUpdate: (patch: Partial<ScenarioConfig>) => void;
  onReset: () => void;
}

export function ScenarioPanel({
  scenario,
  currency,
  baseline90,
  scenario90,
  onUpdate,
  onReset,
}: ScenarioPanelProps) {
  const isModified =
    scenario.retainerDeltaMonthly !== DEFAULT_SCENARIO.retainerDeltaMonthly ||
    scenario.expenseTrimPercent !== DEFAULT_SCENARIO.expenseTrimPercent ||
    scenario.collectionShiftDays !== DEFAULT_SCENARIO.collectionShiftDays;

  const netImpact = scenario90 - baseline90;

  return (
    <Card className="flex flex-col border-border/80 bg-card/90">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold tracking-tight">
              Scenario Lab
            </CardTitle>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Stress-test retainers, burn, and payment timing.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onReset}
          disabled={!isModified}
          className="text-muted-foreground"
        >
          <RotateCcw className="mr-1 size-3" />
          Reset
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between space-y-5">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Monthly retainer delta
              </span>
              <span className="font-mono font-semibold text-primary tabular-nums">
                {formatCurrency(scenario.retainerDeltaMonthly, currency, {
                  signed: true,
                })}
                /mo
              </span>
            </div>
            <Slider
              value={[scenario.retainerDeltaMonthly]}
              min={-3000}
              max={6000}
              step={250}
              aria-label="Monthly retainer delta"
              onValueChange={(val) => {
                const next = Array.isArray(val) ? val[0] : val;
                if (typeof next === "number") {
                  onUpdate({ retainerDeltaMonthly: next });
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Simulate landing a new client or losing a retainer.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Operating expense trim
              </span>
              <span className="font-mono font-semibold tabular-nums">
                -{scenario.expenseTrimPercent}%
              </span>
            </div>
            <Slider
              value={[scenario.expenseTrimPercent]}
              min={0}
              max={40}
              step={5}
              aria-label="Operating expense trim percentage"
              onValueChange={(val) => {
                const next = Array.isArray(val) ? val[0] : val;
                if (typeof next === "number") {
                  onUpdate({ expenseTrimPercent: next });
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Invoice collection shift
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {scenario.collectionShiftDays > 0
                  ? `+${scenario.collectionShiftDays}d slower`
                  : scenario.collectionShiftDays < 0
                    ? `${scenario.collectionShiftDays}d faster`
                    : "On schedule"}
              </span>
            </div>
            <Slider
              value={[scenario.collectionShiftDays]}
              min={-10}
              max={30}
              step={2}
              aria-label="Invoice collection timing shift in days"
              onValueChange={(val) => {
                const next = Array.isArray(val) ? val[0] : val;
                if (typeof next === "number") {
                  onUpdate({ collectionShiftDays: next });
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Effective tax reserve rate
              </span>
              <span className="font-mono font-semibold text-amber-500 tabular-nums">
                {scenario.taxRatePercent}%
              </span>
            </div>
            <Slider
              value={[scenario.taxRatePercent]}
              min={10}
              max={45}
              step={1}
              aria-label="Effective tax reserve rate"
              onValueChange={(val) => {
                const next = Array.isArray(val) ? val[0] : val;
                if (typeof next === "number") {
                  onUpdate({ taxRatePercent: next });
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Separator />
          <div className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2.5 text-xs">
            <span className="text-muted-foreground">90-day scenario delta</span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                netImpact > 0
                  ? "text-emerald-500"
                  : netImpact < 0
                    ? "text-rose-500"
                    : "text-foreground"
              }`}
            >
              {formatCurrency(netImpact, currency, { signed: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
