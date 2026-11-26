import { describe, expect, it } from "vitest";
import { transactionsToCsv } from "../csv";
import { buildCashflowForecast } from "../forecast";
import { TransactionInputSchema } from "../schemas";
import { createSeedState } from "../seed";

describe("Pulseboard cash-flow forecast engine", () => {
  const refDate = "2026-11-25";

  it("computes live cash on hand from opening balance and paid items", () => {
    const state = createSeedState(refDate);
    const forecast = buildCashflowForecast({
      transactions: state.transactions,
      settings: state.settings,
      scenario: state.scenario,
      referenceDate: refDate,
    });

    // Opening 14200 + paid inflows (6400 + 3200) - paid outflows (1650 + 1800) = 20350
    expect(forecast.summary.cashOnHand).toBe(20350);
    expect(forecast.summary.overdueCount).toBe(1);
    expect(forecast.summary.overdueAmount).toBe(4200);
    expect(forecast.points).toHaveLength(91);
  });

  it("reflects scenario sliders in 90-day projected balance", () => {
    const state = createSeedState(refDate);
    const base = buildCashflowForecast({
      transactions: state.transactions,
      settings: state.settings,
      scenario: state.scenario,
      referenceDate: refDate,
    });

    const upside = buildCashflowForecast({
      transactions: state.transactions,
      settings: state.settings,
      scenario: {
        ...state.scenario,
        retainerDeltaMonthly: 2000,
        expenseTrimPercent: 20,
      },
      referenceDate: refDate,
    });

    expect(upside.summary.projected90DayScenario).toBeGreaterThan(
      base.summary.projected90DayBaseline
    );
    expect(upside.summary.monthlyBurnEstimate).toBeLessThan(
      base.summary.monthlyBurnEstimate
    );
  });

  it("triggers critical overdue alert and clears it when settled", () => {
    const state = createSeedState(refDate);
    const withOverdue = buildCashflowForecast({
      transactions: state.transactions,
      settings: state.settings,
      scenario: state.scenario,
      referenceDate: refDate,
    });
    expect(withOverdue.alerts.some((a) => a.id === "overdue-invoices")).toBe(true);

    const settledTransactions = state.transactions.map((tx) =>
      tx.status === "overdue" ? { ...tx, status: "paid" as const } : tx
    );
    const afterPaid = buildCashflowForecast({
      transactions: settledTransactions,
      settings: state.settings,
      scenario: state.scenario,
      referenceDate: refDate,
    });

    expect(afterPaid.alerts.some((a) => a.id === "overdue-invoices")).toBe(false);
    expect(afterPaid.summary.cashOnHand).toBe(20350 + 4200);
  });
});

describe("Validation & CSV export", () => {
  it("rejects invalid transaction amounts and malformed dates", () => {
    const result = TransactionInputSchema.safeParse({
      title: "Bad item",
      counterparty: "Client",
      kind: "invoice",
      status: "pending",
      category: "Client Work",
      amount: -50,
      date: "25-11-2026",
      recurrence: "once",
      notes: "",
    });
    expect(result.success).toBe(false);
  });

  it("escapes CSV cells and neutralizes formula injection prefixes", () => {
    const state = createSeedState("2026-11-25");
    const csv = transactionsToCsv([
      {
        ...state.transactions[0],
        title: '=HYPERLINK("https://evil.test","Click")',
        notes: 'Contains, comma and "quotes"',
      },
    ]);

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Contains, comma and ""quotes"""');
  });
});
