import { DailyReportButton } from "@/features/sales/components/DailyReportButton";
import { SettingsButton } from "@/features/settings/components/SettingsButton";

import { ThemeToggle } from "./theme-toggle";

export function AppHeaderActions() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle />
      <DailyReportButton />
      <SettingsButton />
    </div>
  );
}
