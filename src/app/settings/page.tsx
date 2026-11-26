"use client";

import * as React from "react";
import { Download, RotateCcw, Save, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CURRENCIES,
  SettingsSchema,
  type CurrencyCode,
  type PulseboardSettings,
} from "@/lib/schemas";
import { usePulseboard } from "@/lib/store";

function BaselineSettingsForm({
  settings,
  onSave,
  onError,
}: {
  settings: PulseboardSettings;
  onSave: (next: PulseboardSettings) => void;
  onError: (msg: string) => void;
}) {
  const [businessName, setBusinessName] = React.useState(settings.businessName);
  const [currency, setCurrency] = React.useState<CurrencyCode>(settings.currency);
  const [openingBalance, setOpeningBalance] = React.useState(
    String(settings.openingBalance)
  );
  const [taxRatePercent, setTaxRatePercent] = React.useState(
    String(settings.taxRatePercent)
  );
  const [safetyFloor, setSafetyFloor] = React.useState(
    String(settings.safetyFloor)
  );
  const [monthlyBurnBudget, setMonthlyBurnBudget] = React.useState(
    String(settings.monthlyBurnBudget)
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = SettingsSchema.safeParse({
      businessName,
      currency,
      openingBalance: Number(openingBalance),
      taxRatePercent: Number(taxRatePercent),
      safetyFloor: Number(safetyFloor),
      monthlyBurnBudget: Number(monthlyBurnBudget),
      theme: settings.theme,
    });

    if (!parsed.success) {
      onError(
        parsed.error.issues[0]?.message ?? "Please check your settings values."
      );
      return;
    }

    onSave(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="set-biz">Studio / Business Name</Label>
          <Input
            id="set-biz"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Display Currency</Label>
          <Select
            value={currency}
            onValueChange={(val) => {
              if (val) setCurrency(val as CurrencyCode);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="set-open">Opening Balance Anchor</Label>
          <Input
            id="set-open"
            type="number"
            className="font-mono tabular-nums"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Settled checking balance before logged paid entries.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="set-tax">Default Tax Reserve Rate (%)</Label>
          <Input
            id="set-tax"
            type="number"
            min="10"
            max="45"
            className="font-mono tabular-nums"
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Applied to gross taxable inflows (10%–45%).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="set-floor">Cash Safety Floor</Label>
          <Input
            id="set-floor"
            type="number"
            min="0"
            className="font-mono tabular-nums"
            value={safetyFloor}
            onChange={(e) => setSafetyFloor(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Triggers an alert when projected 90-day cash dips below this line.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="set-burn">Monthly Burn Target</Label>
          <Input
            id="set-burn"
            type="number"
            min="1"
            className="font-mono tabular-nums"
            value={monthlyBurnBudget}
            onChange={(e) => setMonthlyBurnBudget(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Flags when recurring operating expenses exceed this monthly cap.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          <Save className="mr-1.5 size-3.5" />
          Save configuration
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const {
    state,
    updateSettings,
    toggleTheme,
    resetDemoData,
    importStateJson,
  } = usePulseboard();

  const [feedback, setFeedback] = React.useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  function handleDownloadBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pulseboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleUploadBackup(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importStateJson(text);
    setFeedback(
      result.ok
        ? { type: "ok", text: "Backup restored into workspace." }
        : { type: "err", text: result.error }
    );
    event.target.value = "";
  }

  const settingsKey = `${state.settings.businessName}:${state.settings.currency}:${state.settings.openingBalance}:${state.settings.taxRatePercent}:${state.settings.safetyFloor}:${state.settings.monthlyBurnBudget}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-primary">
          Workspace Configuration
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Reserves & Guardrails
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your opening cash anchor, tax set-aside rate, safety floor, and workspace backups.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-rose-500/30 bg-rose-500/10 text-rose-500"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <Card className="border-border/80 bg-card/90">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Financial Baseline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BaselineSettingsForm
            key={settingsKey}
            settings={state.settings}
            onSave={(next) => {
              updateSettings(next);
              setFeedback({
                type: "ok",
                text: "Workspace thresholds and reserve settings saved.",
              });
            }}
            onError={(text) => setFeedback({ type: "err", text })}
          />
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/90">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Appearance & Data Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">
                Switch between obsidian dark mode and crisp light surfaces.
              </p>
            </div>
            <Switch
              checked={state.settings.theme === "dark"}
              onCheckedChange={toggleTheme}
              aria-label="Toggle dark mode"
            />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Portable Workspace Snapshot</p>
              <p className="text-xs text-muted-foreground">
                Export or restore all transactions, scenarios, and settings as JSON.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadBackup}
              >
                <Download className="mr-1.5 size-3.5" />
                Export JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 size-3.5" />
                Import JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleUploadBackup}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Reset Demo Workspace</p>
              <p className="text-xs text-muted-foreground">
                Restore the initial seeded freelance studio transactions and defaults.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                resetDemoData();
                setFeedback({
                  type: "ok",
                  text: "Demo workspace reset to initial seeded dataset.",
                });
              }}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset demo data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
