"use client"

import { useFeedbackSurveyProcessor } from "@/hooks/useFeedbackSurveyProcessor"
import { ScheduledMaintenanceBanner } from "./ScheduledMaintenanceBanner"
import { SystemDialogProvider } from "@/components/ui/SystemDialogProvider"
import { PortalFeedbackLauncher } from "@/components/feedback/PortalFeedbackLauncher"
import { ApprovalCallbackHandoff } from "@/components/auth/ApprovalCallbackHandoff"

export function RootClientProvider({ children }: { children: React.ReactNode }) {
  useFeedbackSurveyProcessor()
  return (
    <>
      <ApprovalCallbackHandoff />
      <ScheduledMaintenanceBanner />
      {children}
      <SystemDialogProvider />
      <PortalFeedbackLauncher />
    </>
  )
}
