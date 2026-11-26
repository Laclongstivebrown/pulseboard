"use client";

import * as React from "react";
import { toIsoDate } from "./format";
import {
  PulseboardStateSchema,
  ScenarioConfigSchema,
  SettingsSchema,
  TransactionInputSchema,
  type PulseboardSettings,
  type PulseboardState,
  type ScenarioConfig,
  type Transaction,
  type TransactionInput,
  type TransactionStatus,
} from "./schemas";
import { createSeedState, DEFAULT_SCENARIO } from "./seed";

const STORAGE_KEY = "pulseboard.state.v1";

const SERVER_REFERENCE_DATE = toIsoDate();
const SERVER_SNAPSHOT: PulseboardState = createSeedState(SERVER_REFERENCE_DATE);

let clientSnapshot: PulseboardState | null = null;
const listeners = new Set<() => void>();

function loadClientSnapshot(): PulseboardState {
  if (clientSnapshot) return clientSnapshot;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = PulseboardStateSchema.safeParse(JSON.parse(saved));
      if (parsed.success) {
        clientSnapshot = parsed.data;
        return clientSnapshot;
      }
    }
  } catch {
    // Fallback to seeded state when storage is unavailable or corrupted
  }
  clientSnapshot = createSeedState(toIsoDate());
  return clientSnapshot;
}

function updateClientSnapshot(
  updater: (prev: PulseboardState) => PulseboardState
) {
  const prev = loadClientSnapshot();
  const next = updater(prev);
  clientSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors in private browsing
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribeStore(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

const emptySubscribe = () => () => {};

interface PulseboardContextValue {
  state: PulseboardState;
  hydrated: boolean;
  referenceDate: string;
  addTransaction: (input: TransactionInput) => Transaction;
  updateTransaction: (id: string, input: TransactionInput) => Transaction;
  deleteTransaction: (id: string) => void;
  setTransactionStatus: (id: string, status: TransactionStatus) => void;
  updateScenario: (patch: Partial<ScenarioConfig>) => void;
  resetScenario: () => void;
  updateSettings: (patch: Partial<PulseboardSettings>) => void;
  toggleTheme: () => void;
  resetDemoData: () => void;
  importStateJson: (rawJson: string) => { ok: true } | { ok: false; error: string };
}

const PulseboardContext = React.createContext<PulseboardContextValue | null>(null);

function nextReferenceCode(
  kind: Transaction["kind"],
  existing: Transaction[]
): string {
  const prefix =
    kind === "invoice" ? "INV" : kind === "retainer" ? "RET" : "EXP";
  const maxNum = existing.reduce((max, tx) => {
    const match = tx.referenceCode.match(/\d+/);
    const num = match ? Number(match[0]) : 0;
    return Math.max(max, num);
  }, 2044);
  return `${prefix}-${maxNum + 1}`;
}

export function PulseboardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = React.useSyncExternalStore(
    subscribeStore,
    loadClientSnapshot,
    () => SERVER_SNAPSHOT
  );
  const hydrated = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const referenceDate = hydrated ? toIsoDate() : SERVER_REFERENCE_DATE;

  React.useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [state.settings.theme]);

  const addTransaction = React.useCallback((input: TransactionInput) => {
    const validated = TransactionInputSchema.parse(input);
    let created: Transaction | null = null;
    updateClientSnapshot((prev) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `tx-${crypto.randomUUID().slice(0, 8)}`
          : `tx-${Date.now()}`;
      created = {
        ...validated,
        id,
        referenceCode: nextReferenceCode(validated.kind, prev.transactions),
      };
      return {
        ...prev,
        transactions: [created, ...prev.transactions],
      };
    });
    return (
      created ?? {
        ...validated,
        id: `tx-${Date.now()}`,
        referenceCode: "TX-NEW",
      }
    );
  }, []);

  const updateTransaction = React.useCallback(
    (id: string, input: TransactionInput) => {
      const validated = TransactionInputSchema.parse(input);
      let updated: Transaction | null = null;
      updateClientSnapshot((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) => {
          if (tx.id !== id) return tx;
          updated = { ...tx, ...validated };
          return updated;
        }),
      }));
      return (
        updated ?? {
          ...validated,
          id,
          referenceCode: "TX-UPD",
        }
      );
    },
    []
  );

  const deleteTransaction = React.useCallback((id: string) => {
    updateClientSnapshot((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== id),
    }));
  }, []);

  const setTransactionStatus = React.useCallback(
    (id: string, status: TransactionStatus) => {
      updateClientSnapshot((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, status } : tx
        ),
      }));
    },
    []
  );

  const updateScenario = React.useCallback((patch: Partial<ScenarioConfig>) => {
    updateClientSnapshot((prev) => ({
      ...prev,
      scenario: ScenarioConfigSchema.parse({ ...prev.scenario, ...patch }),
    }));
  }, []);

  const resetScenario = React.useCallback(() => {
    updateClientSnapshot((prev) => ({
      ...prev,
      scenario: {
        ...DEFAULT_SCENARIO,
        taxRatePercent: prev.settings.taxRatePercent,
      },
    }));
  }, []);

  const updateSettings = React.useCallback(
    (patch: Partial<PulseboardSettings>) => {
      updateClientSnapshot((prev) => {
        const nextSettings = SettingsSchema.parse({
          ...prev.settings,
          ...patch,
        });
        return {
          ...prev,
          settings: nextSettings,
          scenario:
            patch.taxRatePercent !== undefined
              ? { ...prev.scenario, taxRatePercent: patch.taxRatePercent }
              : prev.scenario,
        };
      });
    },
    []
  );

  const toggleTheme = React.useCallback(() => {
    updateClientSnapshot((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: prev.settings.theme === "dark" ? "light" : "dark",
      },
    }));
  }, []);

  const resetDemoData = React.useCallback(() => {
    updateClientSnapshot(() => createSeedState(toIsoDate()));
  }, []);

  const importStateJson = React.useCallback(
    (rawJson: string): { ok: true } | { ok: false; error: string } => {
      try {
        const parsedJson = JSON.parse(rawJson);
        const validated = PulseboardStateSchema.safeParse(parsedJson);
        if (!validated.success) {
          return {
            ok: false,
            error:
              validated.error.issues[0]?.message ?? "Invalid Pulseboard JSON",
          };
        }
        updateClientSnapshot(() => validated.data);
        return { ok: true };
      } catch {
        return { ok: false, error: "File is not valid JSON" };
      }
    },
    []
  );

  const value = React.useMemo<PulseboardContextValue>(
    () => ({
      state,
      hydrated,
      referenceDate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      setTransactionStatus,
      updateScenario,
      resetScenario,
      updateSettings,
      toggleTheme,
      resetDemoData,
      importStateJson,
    }),
    [
      state,
      hydrated,
      referenceDate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      setTransactionStatus,
      updateScenario,
      resetScenario,
      updateSettings,
      toggleTheme,
      resetDemoData,
      importStateJson,
    ]
  );

  return (
    <PulseboardContext.Provider value={value}>
      {children}
    </PulseboardContext.Provider>
  );
}

export function usePulseboard(): PulseboardContextValue {
  const ctx = React.useContext(PulseboardContext);
  if (!ctx) {
    throw new Error("usePulseboard must be used within PulseboardProvider");
  }
  return ctx;
}
