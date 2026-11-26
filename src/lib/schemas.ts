import { z } from "zod";

export const TRANSACTION_KINDS = ["invoice", "retainer", "expense"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const TRANSACTION_STATUSES = [
  "paid",
  "pending",
  "overdue",
  "scheduled",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_CATEGORIES = [
  "Client Work",
  "Retainer",
  "Software",
  "Contractors",
  "Hardware",
  "Tax Payment",
  "Workspace",
  "Other",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const RECURRENCES = ["once", "monthly", "quarterly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const TransactionSchema = z.object({
  id: z.string().min(1),
  referenceCode: z.string().min(2).max(24),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(80),
  counterparty: z
    .string()
    .trim()
    .min(2, "Client or vendor is required")
    .max(60),
  kind: z.enum(TRANSACTION_KINDS),
  status: z.enum(TRANSACTION_STATUSES),
  category: z.enum(TRANSACTION_CATEGORIES),
  amount: z.number().finite().positive("Amount must be greater than zero").max(1_000_000),
  date: z.string().regex(ISO_DATE_RE, "Use YYYY-MM-DD format"),
  recurrence: z.enum(RECURRENCES),
  notes: z.string().max(240).optional().default(""),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const TransactionInputSchema = TransactionSchema.omit({
  id: true,
  referenceCode: true,
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const ScenarioConfigSchema = z.object({
  retainerDeltaMonthly: z.number().min(-5000).max(10000),
  expenseTrimPercent: z.number().min(0).max(50),
  taxRatePercent: z.number().min(10).max(45),
  collectionShiftDays: z.number().min(-14).max(45),
});
export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>;

export const SettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(60),
  currency: z.enum(CURRENCIES),
  openingBalance: z.number().finite().min(-100_000).max(10_000_000),
  taxRatePercent: z.number().min(10).max(45),
  safetyFloor: z.number().finite().min(0).max(1_000_000),
  monthlyBurnBudget: z.number().finite().positive().max(1_000_000),
  theme: z.enum(["dark", "light"]),
});
export type PulseboardSettings = z.infer<typeof SettingsSchema>;

export const PulseboardStateSchema = z.object({
  version: z.literal(1),
  transactions: z.array(TransactionSchema),
  settings: SettingsSchema,
  scenario: ScenarioConfigSchema,
});
export type PulseboardState = z.infer<typeof PulseboardStateSchema>;
