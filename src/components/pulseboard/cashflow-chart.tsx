"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ForecastPoint } from "@/lib/forecast";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { CurrencyCode } from "@/lib/schemas";

interface CashflowChartProps {
  points: ForecastPoint[];
  safetyFloor: number;
  currency: CurrencyCode;
  hydrated: boolean;
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 290;
const PAD = { top: 20, right: 18, bottom: 30, left: 62 };

export function CashflowChart({
  points,
  safetyFloor,
  currency,
  hydrated,
}: CashflowChartProps) {
  const [horizon, setHorizon] = React.useState<"30" | "60" | "90">("90");
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  const visiblePoints = React.useMemo(() => {
    const maxDay = Number(horizon);
    return points.slice(0, maxDay + 1);
  }, [points, horizon]);

  const { minVal, maxVal, baselinePath, scenarioPath, areaPath, floorY } =
    React.useMemo(() => {
      if (visiblePoints.length === 0) {
        return {
          minVal: 0,
          maxVal: 10000,
          baselinePath: "",
          scenarioPath: "",
          areaPath: "",
          floorY: 0,
        };
      }

      const values = visiblePoints.flatMap((p) => [
        p.baselineBalance,
        p.scenarioBalance,
      ]);
      values.push(safetyFloor);

      const rawMin = Math.min(...values);
      const rawMax = Math.max(...values);
      const span = Math.max(1000, rawMax - rawMin);
      const paddedMin = Math.floor((rawMin - span * 0.12) / 500) * 500;
      const paddedMax = Math.ceil((rawMax + span * 0.12) / 500) * 500;

      const innerW = CHART_WIDTH - PAD.left - PAD.right;
      const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;

      const getX = (idx: number) =>
        PAD.left +
        (idx / Math.max(1, visiblePoints.length - 1)) * innerW;
      const getY = (val: number) =>
        PAD.top +
        ((paddedMax - val) / Math.max(1, paddedMax - paddedMin)) * innerH;

      const baseCoords = visiblePoints.map((p, i) => ({
        x: getX(i),
        y: getY(p.baselineBalance),
      }));
      const scenCoords = visiblePoints.map((p, i) => ({
        x: getX(i),
        y: getY(p.scenarioBalance),
      }));

      const toSvgLine = (coords: Array<{ x: number; y: number }>) =>
        coords
          .map(
            (pt, i) =>
              `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
          )
          .join(" ");

      const scenLine = toSvgLine(scenCoords);
      const bottomY = CHART_HEIGHT - PAD.bottom;
      const area = `${scenLine} L ${scenCoords[scenCoords.length - 1].x.toFixed(1)} ${bottomY} L ${scenCoords[0].x.toFixed(1)} ${bottomY} Z`;

      return {
        minVal: paddedMin,
        maxVal: paddedMax,
        baselinePath: toSvgLine(baseCoords),
        scenarioPath: scenLine,
        areaPath: area,
        floorY: getY(safetyFloor),
      };
    }, [visiblePoints, safetyFloor]);

  const innerW = CHART_WIDTH - PAD.left - PAD.right;
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const inspectedIndex =
    activeIdx !== null && activeIdx < visiblePoints.length
      ? activeIdx
      : visiblePoints.length - 1;
  const inspected = visiblePoints[inspectedIndex];

  const getCoordX = (idx: number) =>
    PAD.left + (idx / Math.max(1, visiblePoints.length - 1)) * innerW;
  const getCoordY = (val: number) =>
    PAD.top + ((maxVal - val) / Math.max(1, maxVal - minVal)) * innerH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = minVal + (maxVal - minVal) * (1 - t);
    return {
      val,
      y: PAD.top + t * innerH,
    };
  });

  const xTickIndices = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.min(
      visiblePoints.length - 1,
      Math.round(ratio * (visiblePoints.length - 1))
    )
  );

  function handlePointerMove(event: React.MouseEvent<SVGSVGElement>) {
    if (visiblePoints.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const clamped = Math.max(PAD.left, Math.min(CHART_WIDTH - PAD.right, relX));
    const ratio = (clamped - PAD.left) / innerW;
    const idx = Math.round(ratio * (visiblePoints.length - 1));
    setActiveIdx(idx);
  }

  return (
    <Card className="border-border/80 bg-card/90">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Cash-Flow Forecast Timeline
            </CardTitle>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 font-mono text-[11px] text-primary"
            >
              Live model
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Compare your committed baseline against interactive scenario adjustments.
          </p>
        </div>

        <Tabs
          value={horizon}
          onValueChange={(val) => setHorizon(val as "30" | "60" | "90")}
        >
          <TabsList>
            <TabsTrigger value="30" className="font-mono text-xs">
              30D
            </TabsTrigger>
            <TabsTrigger value="60" className="font-mono text-xs">
              60D
            </TabsTrigger>
            <TabsTrigger value="90" className="font-mono text-xs">
              90D
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hydrated || !inspected ? (
          <div className="h-[290px] w-full animate-pulse rounded-lg bg-muted/60" />
        ) : (
          <>
            {/* Interactive HUD Readout */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/35 px-3.5 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Date </span>
                  <span className="font-mono font-medium text-foreground">
                    {formatShortDate(inspected.date)} (D+{inspected.dayIndex})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Scenario</span>
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {formatCurrency(inspected.scenarioBalance, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 border-t border-dashed border-muted-foreground" />
                  <span className="text-muted-foreground">Baseline</span>
                  <span className="font-mono font-medium text-muted-foreground tabular-nums">
                    {formatCurrency(inspected.baselineBalance, currency)}
                  </span>
                </div>
              </div>

              {inspected.events.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {inspected.events.slice(0, 2).map((ev, idx) => (
                    <Badge
                      key={`${ev.id}-${idx}`}
                      variant="outline"
                      className={`font-mono text-[11px] tabular-nums ${
                        ev.signedAmount >= 0
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {ev.title}:{" "}
                      {formatCurrency(ev.signedAmount, currency, { signed: true })}
                    </Badge>
                  ))}
                  {inspected.events.length > 2 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{inspected.events.length - 2} more
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Hover chart to inspect daily cash events
                </span>
              )}
            </div>

            <div className="relative w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="h-auto w-full select-none overflow-visible"
                role="img"
                aria-label="90-day cash flow projection chart"
                onMouseMove={handlePointerMove}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <defs>
                  <linearGradient
                    id="pulseboardAreaGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-primary)"
                      stopOpacity="0.28"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-primary)"
                      stopOpacity="0.01"
                    />
                  </linearGradient>
                </defs>

                {/* Horizontal gridlines + Y labels */}
                {yTicks.map((tick, idx) => (
                  <g key={idx}>
                    <line
                      x1={PAD.left}
                      y1={tick.y}
                      x2={CHART_WIDTH - PAD.right}
                      y2={tick.y}
                      stroke="var(--color-border)"
                      strokeDasharray="3 4"
                      strokeOpacity="0.85"
                    />
                    <text
                      x={PAD.left - 8}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                    >
                      {formatCurrency(tick.val, currency, { compact: true })}
                    </text>
                  </g>
                ))}

                {/* Safety Floor Threshold */}
                {floorY >= PAD.top && floorY <= CHART_HEIGHT - PAD.bottom && (
                  <g>
                    <line
                      x1={PAD.left}
                      y1={floorY}
                      x2={CHART_WIDTH - PAD.right}
                      y2={floorY}
                      stroke="#f59e0b"
                      strokeWidth="1.25"
                      strokeDasharray="5 4"
                      strokeOpacity="0.8"
                    />
                    <text
                      x={CHART_WIDTH - PAD.right - 4}
                      y={floorY - 6}
                      textAnchor="end"
                      className="fill-amber-500 font-mono text-[10px]"
                    >
                      Safety floor {formatCurrency(safetyFloor, currency, { compact: true })}
                    </text>
                  </g>
                )}

                {/* Area under scenario curve */}
                <path d={areaPath} fill="url(#pulseboardAreaGrad)" />

                {/* Baseline curve */}
                <path
                  d={baselinePath}
                  fill="none"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                  strokeOpacity="0.7"
                />

                {/* Scenario curve */}
                <path
                  d={scenarioPath}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Event markers on curve */}
                {visiblePoints.map((pt, i) =>
                  pt.events.length > 0 ? (
                    <circle
                      key={`ev-${pt.dayIndex}`}
                      cx={getCoordX(i)}
                      cy={getCoordY(pt.scenarioBalance)}
                      r={activeIdx === i ? 4.5 : 2.8}
                      className="fill-background stroke-primary"
                      strokeWidth="1.75"
                    />
                  ) : null
                )}

                {/* Hover Crosshair */}
                <line
                  x1={getCoordX(inspectedIndex)}
                  y1={PAD.top}
                  x2={getCoordX(inspectedIndex)}
                  y2={CHART_HEIGHT - PAD.bottom}
                  stroke="var(--color-foreground)"
                  strokeOpacity="0.22"
                  strokeWidth="1"
                />
                <circle
                  cx={getCoordX(inspectedIndex)}
                  cy={getCoordY(inspected.scenarioBalance)}
                  r="4.5"
                  fill="var(--color-primary)"
                  stroke="var(--color-background)"
                  strokeWidth="2"
                />

                {/* X axis date ticks */}
                {xTickIndices.map((idx) => {
                  const pt = visiblePoints[idx];
                  if (!pt) return null;
                  return (
                    <text
                      key={`xt-${idx}`}
                      x={getCoordX(idx)}
                      y={CHART_HEIGHT - 8}
                      textAnchor={
                        idx === 0
                          ? "start"
                          : idx === visiblePoints.length - 1
                            ? "end"
                            : "middle"
                      }
                      className="fill-muted-foreground font-mono text-[10px]"
                    >
                      {formatShortDate(pt.date)}
                    </text>
                  );
                })}
              </svg>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
