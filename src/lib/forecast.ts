import { addDaysIso, diffDaysIso } from "./format";
import type {
  PulseboardSettings,
  ScenarioConfig,
  Transaction,
} from "./schemas";

export interface ForecastDayEvent {
  id: string;
  title: string;
  kind: Transaction["kind"];
  amount: number;
  signedAmount: number;
}

export interface ForecastPoint {
  dayIndex: number;
  date: string;
  baselineBalance: number;
  scenarioBalance: number;
  baselineInflow: number;
  baselineOutflow: number;
  scenarioInflow: number;
  scenarioOutflow: number;
  events: ForecastDayEvent[];
}

export interface BudgetAlert {
  id: string;
  severity: "critical" | "warning" | "healthy";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface CashflowSummary {
  cashOnHand: number;
  projected90DayBaseline: number;
  projected90DayScenario: number;
  lowestScenarioBalance: number;
  lowestScenarioDate: string;
  pendingReceivables: number;
  overdueAmount: number;
  overdueCount: number;
  monthlyBurnEstimate: number;
  monthlyIncomeEstimate: number;
  taxReserveTarget: number;
  taxPaidToDate: number;
  taxReserveGap: number;
  runwayDays: number | null;
}

export interface CashflowForecast {
  points: ForecastPoint[];
  summary: CashflowSummary;
  alerts: BudgetAlert[];
}

function isInflow(tx: Transaction): boolean {
  return tx.kind === "invoice" || tx.kind === "retainer";
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function expandProjectedOccurrences(
  tx: Transaction,
  referenceDate: string,
  horizonDays: number,
  shiftDays: number
): Array<{ dayIndex: number; amount: number }> {
  const occurrences: Array<{ dayIndex: number; amount: number }> = [];

  if (tx.status === "paid" && tx.recurrence === "once") {
    return occurrences;
  }

  const baseOffset = diffDaysIso(referenceDate, tx.date);
  const effectiveShift = isInflow(tx) ? shiftDays : 0;

  if (tx.recurrence === "once") {
    // Pending/overdue items land at least by day 1 + shift if overdue/in the past
    const rawDay = Math.max(1, baseOffset) + effectiveShift;
    const clampedDay = Math.max(0, rawDay);
    if (clampedDay <= horizonDays) {
      occurrences.push({ dayIndex: clampedDay, amount: tx.amount });
    }
    return occurrences;
  }

  const stepDays = tx.recurrence === "monthly" ? 30 : 90;
  // Paid recurring items already settled their current cycle; project upcoming cycles only.
  let cursor = tx.status === "paid" ? baseOffset + stepDays : baseOffset;
  while (cursor < (tx.status === "paid" ? 1 : 0)) {
    cursor += stepDays;
  }
  while (cursor <= horizonDays + Math.abs(effectiveShift)) {
    const shifted = Math.max(tx.status === "paid" ? 1 : 0, cursor + effectiveShift);
    if (shifted >= 0 && shifted <= horizonDays) {
      occurrences.push({ dayIndex: shifted, amount: tx.amount });
    }
    cursor += stepDays;
  }

  return occurrences;
}

export function buildCashflowForecast(params: {
  transactions: Transaction[];
  settings: PulseboardSettings;
  scenario: ScenarioConfig;
  referenceDate: string;
  horizonDays?: number;
}): CashflowForecast {
  const {
    transactions,
    settings,
    scenario,
    referenceDate,
    horizonDays = 90,
  } = params;

  let settledDelta = 0;
  let settledGrossInflow = 0;
  let taxPaidToDate = 0;
  let pendingReceivables = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const tx of transactions) {
    const inflow = isInflow(tx);
    if (tx.status === "paid") {
      settledDelta += inflow ? tx.amount : -tx.amount;
      if (inflow) {
        settledGrossInflow += tx.amount;
      } else if (tx.category === "Tax Payment") {
        taxPaidToDate += tx.amount;
      }
    } else if (inflow) {
      pendingReceivables += tx.amount;
      if (tx.status === "overdue" || diffDaysIso(referenceDate, tx.date) < 0) {
        overdueAmount += tx.amount;
        overdueCount += 1;
      }
    }
  }

  const cashOnHand = roundMoney(settings.openingBalance + settledDelta);

  const baselineIn = new Array<number>(horizonDays + 1).fill(0);
  const baselineOut = new Array<number>(horizonDays + 1).fill(0);
  const scenarioIn = new Array<number>(horizonDays + 1).fill(0);
  const scenarioOut = new Array<number>(horizonDays + 1).fill(0);
  const eventsByDay: ForecastDayEvent[][] = Array.from(
    { length: horizonDays + 1 },
    () => []
  );

  const expenseMultiplier = 1 - scenario.expenseTrimPercent / 100;

  for (const tx of transactions) {
    const inflow = isInflow(tx);
    const baseOcc = expandProjectedOccurrences(tx, referenceDate, horizonDays, 0);
    for (const occ of baseOcc) {
      if (inflow) {
        baselineIn[occ.dayIndex] += occ.amount;
      } else {
        baselineOut[occ.dayIndex] += occ.amount;
      }
    }

    const scenOcc = expandProjectedOccurrences(
      tx,
      referenceDate,
      horizonDays,
      scenario.collectionShiftDays
    );
    for (const occ of scenOcc) {
      if (inflow) {
        scenarioIn[occ.dayIndex] += occ.amount;
        eventsByDay[occ.dayIndex].push({
          id: tx.id,
          title: tx.title,
          kind: tx.kind,
          amount: occ.amount,
          signedAmount: occ.amount,
        });
      } else {
        const adjustedOut =
          tx.category === "Tax Payment"
            ? occ.amount
            : roundMoney(occ.amount * expenseMultiplier);
        scenarioOut[occ.dayIndex] += adjustedOut;
        eventsByDay[occ.dayIndex].push({
          id: tx.id,
          title: tx.title,
          kind: tx.kind,
          amount: adjustedOut,
          signedAmount: -adjustedOut,
        });
      }
    }
  }

  // Apply scenario monthly retainer delta on days 15, 45, 75 (or proportional negative impact)
  if (scenario.retainerDeltaMonthly !== 0) {
    for (const day of [15, 45, 75]) {
      if (day <= horizonDays) {
        if (scenario.retainerDeltaMonthly > 0) {
          scenarioIn[day] += scenario.retainerDeltaMonthly;
          eventsByDay[day].push({
            id: `scenario-retainer-${day}`,
            title: "Scenario retainer delta",
            kind: "retainer",
            amount: scenario.retainerDeltaMonthly,
            signedAmount: scenario.retainerDeltaMonthly,
          });
        } else {
          const reduction = Math.abs(scenario.retainerDeltaMonthly);
          scenarioOut[day] += reduction;
          eventsByDay[day].push({
            id: `scenario-retainer-${day}`,
            title: "Scenario retainer reduction",
            kind: "retainer",
            amount: reduction,
            signedAmount: -reduction,
          });
        }
      }
    }
  }

  const points: ForecastPoint[] = [];
  let runningBaseline = cashOnHand;
  let runningScenario = cashOnHand;
  let lowestScenarioBalance = cashOnHand;
  let lowestScenarioDate = referenceDate;
  let totalScenarioIn90 = 0;

  for (let day = 0; day <= horizonDays; day++) {
    runningBaseline = roundMoney(runningBaseline + baselineIn[day] - baselineOut[day]);
    runningScenario = roundMoney(runningScenario + scenarioIn[day] - scenarioOut[day]);
    totalScenarioIn90 += scenarioIn[day];

    const date = addDaysIso(referenceDate, day);
    if (runningScenario < lowestScenarioBalance) {
      lowestScenarioBalance = runningScenario;
      lowestScenarioDate = date;
    }

    points.push({
      dayIndex: day,
      date,
      baselineBalance: runningBaseline,
      scenarioBalance: runningScenario,
      baselineInflow: roundMoney(baselineIn[day]),
      baselineOutflow: roundMoney(baselineOut[day]),
      scenarioInflow: roundMoney(scenarioIn[day]),
      scenarioOutflow: roundMoney(scenarioOut[day]),
      events: eventsByDay[day],
    });
  }

  // Monthly burn estimate based on recurring + recent 30d expenses adjusted by scenario trim
  const rawMonthlyExpenses = transactions
    .filter((tx) => tx.kind === "expense" && tx.category !== "Tax Payment")
    .reduce((sum, tx) => {
      if (tx.recurrence === "monthly") return sum + tx.amount;
      if (tx.recurrence === "quarterly") return sum + tx.amount / 3;
      const age = Math.abs(diffDaysIso(tx.date, referenceDate));
      return age <= 35 ? sum + tx.amount : sum;
    }, 0);

  const monthlyBurnEstimate = roundMoney(rawMonthlyExpenses * expenseMultiplier);
  const monthlyIncomeEstimate = roundMoney(totalScenarioIn90 / (horizonDays / 30));

  // Tax reserve target across settled + 90-day projected gross inflows
  const taxablePool = settledGrossInflow + totalScenarioIn90 * 0.5;
  const taxReserveTarget = roundMoney(
    taxablePool * (scenario.taxRatePercent / 100)
  );
  const taxReserveGap = roundMoney(Math.max(0, taxReserveTarget - taxPaidToDate));

  const runwayDays =
    monthlyBurnEstimate > 0
      ? Math.max(0, Math.round((cashOnHand / monthlyBurnEstimate) * 30))
      : null;

  const alerts: BudgetAlert[] = [];

  if (overdueCount > 0) {
    alerts.push({
      id: "overdue-invoices",
      severity: "critical",
      title: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} totaling $${Math.round(overdueAmount).toLocaleString("en-US")}`,
      description:
        "Following up or marking settled will immediately lift your near-term cash buffer.",
      actionLabel: "Review ledger",
      actionHref: "/transactions?status=overdue",
    });
  }

  if (lowestScenarioBalance < settings.safetyFloor) {
    alerts.push({
      id: "safety-floor-dip",
      severity: lowestScenarioBalance < 0 ? "critical" : "warning",
      title: `Projected dip below safety floor on ${lowestScenarioDate}`,
      description: `Cash drops to $${Math.round(lowestScenarioBalance).toLocaleString("en-US")} (target floor $${Math.round(settings.safetyFloor).toLocaleString("en-US")}).`,
      actionLabel: "Adjust reserves",
      actionHref: "/settings",
    });
  }

  if (monthlyBurnEstimate > settings.monthlyBurnBudget) {
    alerts.push({
      id: "burn-over-budget",
      severity: "warning",
      title: "Monthly burn exceeds budget target",
      description: `Current burn pace is $${Math.round(monthlyBurnEstimate).toLocaleString("en-US")}/mo vs $${Math.round(settings.monthlyBurnBudget).toLocaleString("en-US")}/mo target.`,
      actionLabel: "Inspect expenses",
      actionHref: "/transactions?kind=expense",
    });
  }

  if (taxReserveGap > 1500) {
    alerts.push({
      id: "tax-reserve-gap",
      severity: "warning",
      title: `Tax reserve gap of $${Math.round(taxReserveGap).toLocaleString("en-US")}`,
      description: `At a ${scenario.taxRatePercent}% effective set-aside rate, schedule an estimated tax transfer before quarter-end.`,
      actionLabel: "Open settings",
      actionHref: "/settings",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "healthy-runway",
      severity: "healthy",
      title: "Cash buffer & burn are within target bounds",
      description:
        "No overdue receivables or projected 90-day safety floor breaches detected.",
    });
  }

  return {
    points,
    summary: {
      cashOnHand,
      projected90DayBaseline: points[points.length - 1]?.baselineBalance ?? cashOnHand,
      projected90DayScenario: points[points.length - 1]?.scenarioBalance ?? cashOnHand,
      lowestScenarioBalance,
      lowestScenarioDate,
      pendingReceivables: roundMoney(pendingReceivables),
      overdueAmount: roundMoney(overdueAmount),
      overdueCount,
      monthlyBurnEstimate,
      monthlyIncomeEstimate,
      taxReserveTarget,
      taxPaidToDate: roundMoney(taxPaidToDate),
      taxReserveGap,
      runwayDays,
    },
    alerts,
  };
}
