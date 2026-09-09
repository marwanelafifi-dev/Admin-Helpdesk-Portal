import { z } from "zod";

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
  category: z.string().optional(),
}).nullable().optional();

export const HrTravelLetterSchema = z.object({
  // TRAVEL REFERENCE DATA (Read-only, from Travel request)
  linkedTravelRequestId: z.string(),
  travelRequestCreatedAt: z.string().optional(), // ISO date from Travel
  travelRequestUpdatedAt: z.string().optional(), // ISO date from Travel

  travelPurpose: z.string(),
  destination: z.string(),
  travelDateFrom: z.string(),
  travelDateTo: z.string(),
  costCenter: z.string(),
  directManagerName: z.string(),

  // HR LETTER SPECIFIC FIELDS (Editable by HR Team)
  passportAttachment: AttachmentSchema,
  invitationLetterAttachment: AttachmentSchema,
  visaDocumentAttachment: z.array(AttachmentSchema).optional(),

  // Letter preparation
  letterPreparedBy: z.string().optional(),
  letterApprovedBy: z.string().optional(),
  letterContent: z.string().max(2000).optional(),
  specialNotes: z.string().max(500).optional(),

  attachments: z.array(AttachmentSchema).optional(),
  ccEmails: z.array(z.string().email()).optional(),
});

export type HrTravelLetter = z.infer<typeof HrTravelLetterSchema>;
