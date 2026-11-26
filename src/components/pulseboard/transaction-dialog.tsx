"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RECURRENCES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_KINDS,
  TRANSACTION_STATUSES,
  TransactionInputSchema,
  type Recurrence,
  type Transaction,
  type TransactionCategory,
  type TransactionInput,
  type TransactionKind,
  type TransactionStatus,
} from "@/lib/schemas";
import { toIsoDate } from "@/lib/format";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
  onSave: (input: TransactionInput, editingId?: string) => void;
}

function buildInitialForm(tx?: Transaction | null): {
  title: string;
  counterparty: string;
  kind: TransactionKind;
  status: TransactionStatus;
  category: TransactionCategory;
  amount: string;
  date: string;
  recurrence: Recurrence;
  notes: string;
} {
  if (tx) {
    return {
      title: tx.title,
      counterparty: tx.counterparty,
      kind: tx.kind,
      status: tx.status,
      category: tx.category,
      amount: String(tx.amount),
      date: tx.date,
      recurrence: tx.recurrence,
      notes: tx.notes ?? "",
    };
  }
  return {
    title: "",
    counterparty: "",
    kind: "invoice",
    status: "pending",
    category: "Client Work",
    amount: "",
    date: toIsoDate(),
    recurrence: "once",
    notes: "",
  };
}

export function TransactionDialog({
  open,
  onOpenChange,
  editingTransaction,
  onSave,
}: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <TransactionDialogForm
            key={editingTransaction?.id ?? "new-entry"}
            editingTransaction={editingTransaction}
            onOpenChange={onOpenChange}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransactionDialogForm({
  editingTransaction,
  onOpenChange,
  onSave,
}: {
  editingTransaction?: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: TransactionInput, editingId?: string) => void;
}) {
  const [form, setForm] = React.useState(() =>
    buildInitialForm(editingTransaction)
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function handleKindChange(kind: TransactionKind) {
    setForm((prev) => ({
      ...prev,
      kind,
      category:
        kind === "retainer"
          ? "Retainer"
          : kind === "invoice"
            ? "Client Work"
            : prev.category === "Client Work" || prev.category === "Retainer"
              ? "Software"
              : prev.category,
      recurrence: kind === "retainer" ? "monthly" : prev.recurrence,
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const numericAmount = Number(form.amount);
    const parsed = TransactionInputSchema.safeParse({
      title: form.title,
      counterparty: form.counterparty,
      kind: form.kind,
      status: form.status,
      category: form.category,
      amount: Number.isFinite(numericAmount) ? numericAmount : -1,
      date: form.date,
      recurrence: form.recurrence,
      notes: form.notes,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    onSave(parsed.data, editingTransaction?.id);
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editingTransaction ? "Edit cash-flow entry" : "New cash-flow entry"}
        </DialogTitle>
        <DialogDescription>
          {editingTransaction
            ? `Updating ${editingTransaction.referenceCode} immediately recalculates your 90-day cash forecast.`
            : "Log an invoice, recurring retainer, or operating expense."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4 pt-1">
          <div className="grid grid-cols-3 gap-2">
            {TRANSACTION_KINDS.map((kind) => {
              const active = form.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleKindChange(kind)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    active
                      ? "border-primary/60 bg-primary/12 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {kind}
                </button>
              );
            })}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tx-title">Title</Label>
            <Input
              id="tx-title"
              placeholder={
                form.kind === "expense"
                  ? "e.g., Figma Organization Plan"
                  : "e.g., Design Sprint Milestone 2"
              }
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tx-counterparty">
                {form.kind === "expense" ? "Vendor" : "Client"}
              </Label>
              <Input
                id="tx-counterparty"
                placeholder={
                  form.kind === "expense" ? "e.g., Vercel" : "e.g., Northstar Labs"
                }
                value={form.counterparty}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, counterparty: e.target.value }))
                }
                aria-invalid={Boolean(errors.counterparty)}
              />
              {errors.counterparty && (
                <p className="text-xs text-destructive">
                  {errors.counterparty}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="2500"
                className="tabular-nums font-mono"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                aria-invalid={Boolean(errors.amount)}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) => {
                  if (val) {
                    setForm((prev) => ({
                      ...prev,
                      status: val as TransactionStatus,
                    }));
                  }
                }}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(val) => {
                  if (val) {
                    setForm((prev) => ({
                      ...prev,
                      category: val as TransactionCategory,
                    }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Recurrence</Label>
              <Select
                value={form.recurrence}
                onValueChange={(val) => {
                  if (val) {
                    setForm((prev) => ({
                      ...prev,
                      recurrence: val as Recurrence,
                    }));
                  }
                }}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((recurrence) => (
                    <SelectItem
                      key={recurrence}
                      value={recurrence}
                      className="capitalize"
                    >
                      {recurrence}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tx-date">Due / Settlement Date</Label>
              <Input
                id="tx-date"
                type="date"
                className="tabular-nums font-mono"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                aria-invalid={Boolean(errors.date)}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="tx-notes">Notes (optional)</Label>
              <Input
                id="tx-notes"
                placeholder="Net-15, ACH, deductible..."
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingTransaction ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
