"use client"

import { useFeedbackSurveyProcessor } from "@/hooks/useFeedbackSurveyProcessor"
import { ScheduledMaintenanceBanner } from "./ScheduledMaintenanceBanner"

export function RootClientProvider({ children }: { children: React.ReactNode }) {
  useFeedbackSurveyProcessor()
  return (
    <>
      <ScheduledMaintenanceBanner />
      {children}
    </>
  )
}
