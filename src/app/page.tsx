"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiStrip } from "@/components/pulseboard/kpi-strip";
import { AlertsBanner } from "@/components/pulseboard/alerts-banner";
import { CashflowChart } from "@/components/pulseboard/cashflow-chart";
import { ScenarioPanel } from "@/components/pulseboard/scenario-panel";
import { TransactionsTable } from "@/components/pulseboard/transactions-table";
import { TransactionDialog } from "@/components/pulseboard/transaction-dialog";
import { buildCashflowForecast } from "@/lib/forecast";
import type { Transaction, TransactionInput } from "@/lib/schemas";
import { usePulseboard } from "@/lib/store";

export default function OverviewPage() {
  const {
    state,
    hydrated,
    referenceDate,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setTransactionStatus,
    updateScenario,
    resetScenario,
  } = usePulseboard();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);

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

  const attentionItems = React.useMemo(
    () => state.transactions.filter((tx) => tx.status !== "paid"),
    [state.transactions]
  );

  function handleSave(input: TransactionInput, editingId?: string) {
    if (editingId) {
      updateTransaction(editingId, input);
    } else {
      addTransaction(input);
    }
    setEditingTx(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-primary">
            Cash-flow Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {state.settings.businessName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            90-day liquidity outlook, open client receivables, and tax reserve pacing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/transactions" />}
          >
            Full ledger
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingTx(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-3.5" />
            New entry
          </Button>
        </div>
      </div>

      <AlertsBanner alerts={forecast.alerts} />

      <KpiStrip
        summary={forecast.summary}
        currency={state.settings.currency}
        taxRatePercent={state.scenario.taxRatePercent}
        hydrated={hydrated}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <CashflowChart
            points={forecast.points}
            safetyFloor={state.settings.safetyFloor}
            currency={state.settings.currency}
            hydrated={hydrated}
          />
        </div>
        <div className="xl:col-span-4">
          <ScenarioPanel
            scenario={state.scenario}
            currency={state.settings.currency}
            baseline90={forecast.summary.projected90DayBaseline}
            scenario90={forecast.summary.projected90DayScenario}
            onUpdate={updateScenario}
            onReset={resetScenario}
          />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Upcoming & Overdue Schedule
            </h2>
            <p className="text-xs text-muted-foreground">
              Click the check icon on any pending or overdue item to settle it immediately.
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            render={<Link href="/transactions" />}
            className="text-muted-foreground"
          >
            View all ({state.transactions.length})
            <ArrowRight className="ml-1 size-3" />
          </Button>
        </div>

        <TransactionsTable
          transactions={attentionItems}
          currency={state.settings.currency}
          compact
          onCreateNew={() => {
            setEditingTx(null);
            setDialogOpen(true);
          }}
          onEdit={(tx) => {
            setEditingTx(tx);
            setDialogOpen(true);
          }}
          onDelete={deleteTransaction}
          onStatusChange={setTransactionStatus}
        />
      </section>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTx(null);
        }}
        editingTransaction={editingTx}
        onSave={handleSave}
      />
    </div>
  );
}
