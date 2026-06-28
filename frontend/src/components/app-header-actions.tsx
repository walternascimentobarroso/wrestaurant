import { DailyReportButton } from "@/features/sales/components/DailyReportButton";
import { ChecklistHeaderButton } from "@/features/checklists/components/ChecklistIncompleteBanner";
import { SettingsButton } from "@/features/settings/components/SettingsButton";

import { ThemeToggle } from "./theme-toggle";

interface AppHeaderActionsProps {
  hideChecklistButton?: boolean;
}

export function AppHeaderActions({ hideChecklistButton = false }: AppHeaderActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle />
      {!hideChecklistButton ? <ChecklistHeaderButton /> : null}
      <DailyReportButton />
      <SettingsButton />
    </div>
  );
}
