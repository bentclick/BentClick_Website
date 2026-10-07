import type { CollectionCategory, LeadStatus } from "@/generated/prisma/enums";

export type LeadItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  eventType: CollectionCategory | null;
  /** YYYY-MM-DD */
  eventDate: string | null;
  message: string;
  status: LeadStatus;
  clientId: string | null;
  createdAt: string;
};

export type LeadCounts = Record<LeadStatus, number>;
