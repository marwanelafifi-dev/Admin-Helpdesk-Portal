"use client"

import { useFeedbackSurveyProcessor } from "@/hooks/useFeedbackSurveyProcessor"
import { ScheduledMaintenanceBanner } from "./ScheduledMaintenanceBanner"
import { SystemDialogProvider } from "@/components/ui/SystemDialogProvider"
import { PortalFeedbackLauncher } from "@/components/feedback/PortalFeedbackLauncher"

export function RootClientProvider({ children }: { children: React.ReactNode }) {
  useFeedbackSurveyProcessor()
  return (
    <>
      <ScheduledMaintenanceBanner />
      {children}
      <SystemDialogProvider />
      <PortalFeedbackLauncher />
    </>
  )
}
