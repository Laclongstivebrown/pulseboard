"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { TransactionsTable } from "@/components/pulseboard/transactions-table";
import { TransactionDialog } from "@/components/pulseboard/transaction-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Transaction, TransactionInput } from "@/lib/schemas";
import { usePulseboard } from "@/lib/store";

function TransactionsContent() {
  const searchParams = useSearchParams();
  const initialKind = searchParams.get("kind") ?? "all";
  const initialStatus = searchParams.get("status") ?? "all";

  const {
    state,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setTransactionStatus,
  } = usePulseboard();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);

  const totals = React.useMemo(() => {
    let inflows = 0;
    let outflows = 0;
    for (const tx of state.transactions) {
      if (tx.kind === "expense") outflows += tx.amount;
      else inflows += tx.amount;
    }
    return { inflows, outflows, net: inflows - outflows };
  }, [state.transactions]);

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
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-primary">
          Invoices & Expenses
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Cash-Flow Ledger
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter, update settlement status, or export your full transaction history as CSV.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-border/80 bg-card/90">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Logged Inflows</div>
            <div className="mt-1 font-mono text-lg font-semibold text-emerald-500 tabular-nums">
              +{formatCurrency(totals.inflows, state.settings.currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/90">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Logged Outflows</div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
              -{formatCurrency(totals.outflows, state.settings.currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/90">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Ledger Net Volume</div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {formatCurrency(totals.net, state.settings.currency, { signed: true })}
            </div>
          </CardContent>
        </Card>
      </div>

      <TransactionsTable
        key={`${initialKind}-${initialStatus}`}
        transactions={state.transactions}
        currency={state.settings.currency}
        initialKindFilter={initialKind}
        initialStatusFilter={initialStatus}
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

export default function TransactionsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted/60" />
        </div>
      }
    >
      <TransactionsContent />
    </React.Suspense>
  );
}
