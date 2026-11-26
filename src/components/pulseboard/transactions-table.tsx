"use client";

import * as React from "react";
import {
  Check,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { transactionsToCsv } from "@/lib/csv";
import { formatCurrencyExact, formatMonthDayYear } from "@/lib/format";
import {
  TRANSACTION_KINDS,
  TRANSACTION_STATUSES,
  type CurrencyCode,
  type Transaction,
  type TransactionKind,
  type TransactionStatus,
} from "@/lib/schemas";

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: CurrencyCode;
  compact?: boolean;
  initialKindFilter?: string;
  initialStatusFilter?: string;
  onCreateNew: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TransactionStatus) => void;
}

const STATUS_BADGE_CLASS: Record<TransactionStatus, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/12 text-emerald-500",
  pending: "border-amber-500/30 bg-amber-500/12 text-amber-500",
  overdue: "border-rose-500/35 bg-rose-500/15 text-rose-500",
  scheduled: "border-sky-500/30 bg-sky-500/12 text-sky-400",
};

export function TransactionsTable({
  transactions,
  currency,
  compact = false,
  initialKindFilter = "all",
  initialStatusFilter = "all",
  onCreateNew,
  onEdit,
  onDelete,
  onStatusChange,
}: TransactionsTableProps) {
  const [query, setQuery] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<string>(initialKindFilter);
  const [statusFilter, setStatusFilter] = React.useState<string>(
    initialStatusFilter
  );
  const [sortBy, setSortBy] = React.useState<"date-desc" | "date-asc" | "amount-desc">(
    compact ? "date-asc" : "date-desc"
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = transactions.filter((tx) => {
      if (kindFilter !== "all" && tx.kind !== kindFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (!q) return true;
      return (
        tx.title.toLowerCase().includes(q) ||
        tx.counterparty.toLowerCase().includes(q) ||
        tx.referenceCode.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q)
      );
    });

    const sorted = [...list].sort((a, b) => {
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "date-asc") return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });

    return compact ? sorted.slice(0, 6) : sorted;
  }, [transactions, query, kindFilter, statusFilter, sortBy, compact]);

  function handleExportCsv() {
    const csv = transactionsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pulseboard-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, client, INV-2042..."
                className="pl-8"
                aria-label="Search transactions"
              />
            </div>

            <Select
              value={kindFilter}
              onValueChange={(val) => setKindFilter(val ?? "all")}
            >
              <SelectTrigger className="w-[130px] capitalize">
                <SelectValue placeholder="All kinds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {TRANSACTION_KINDS.map((k: TransactionKind) => (
                  <SelectItem key={k} value={k} className="capitalize">
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? "all")}
            >
              <SelectTrigger className="w-[135px] capitalize">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TRANSACTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(val) =>
                setSortBy(
                  (val as "date-desc" | "date-asc" | "amount-desc") ??
                    "date-desc"
                )
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Soonest / oldest</SelectItem>
                <SelectItem value="amount-desc">Highest amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
            >
              <Download className="mr-1.5 size-3.5" />
              Export CSV
            </Button>
            <Button type="button" size="sm" onClick={onCreateNew}>
              <Plus className="mr-1.5 size-3.5" />
              New entry
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No matching ledger entries
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Try clearing your filters or create a new invoice, retainer, or expense.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {(query || kindFilter !== "all" || statusFilter !== "all") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setKindFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
            <Button type="button" size="sm" onClick={onCreateNew}>
              <Plus className="mr-1.5 size-3.5" />
              Add entry
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card/85">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[96px]">Ref</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => {
                const isExpense = tx.kind === "expense";
                const signedAmount = isExpense ? -tx.amount : tx.amount;
                return (
                  <TableRow key={tx.id} className="group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {tx.referenceCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {tx.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx.counterparty}
                        {tx.recurrence !== "once" && (
                          <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                            {tx.recurrence}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {tx.category}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${STATUS_BADGE_CLASS[tx.status]}`}
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:table-cell">
                      {formatMonthDayYear(tx.date)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm font-medium tabular-nums ${
                        isExpense ? "text-foreground" : "text-emerald-500"
                      }`}
                    >
                      {signedAmount > 0 ? "+" : ""}
                      {formatCurrencyExact(signedAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {tx.status !== "paid" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title="Mark as paid"
                            aria-label={`Mark ${tx.title} as paid`}
                            onClick={() => onStatusChange(tx.id, "paid")}
                            className="text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-400"
                          >
                            <Check className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          title="Edit entry"
                          aria-label={`Edit ${tx.title}`}
                          onClick={() => onEdit(tx)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          title="Delete entry"
                          aria-label={`Delete ${tx.title}`}
                          onClick={() => onDelete(tx.id)}
                          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
