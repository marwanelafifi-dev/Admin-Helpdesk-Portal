"use client"

import { useFeedbackSurveyProcessor } from "@/hooks/useFeedbackSurveyProcessor"

export function RootClientProvider({ children }: { children: React.ReactNode }) {
  useFeedbackSurveyProcessor()
  return <>{children}</>
}
