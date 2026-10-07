import "server-only";
import type { CollectionCategory, LeadStatus } from "@/generated/prisma/enums";
import type { Db } from "@/lib/db/types";

export type NewLead = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  eventType: CollectionCategory | null;
  eventDate: Date | null;
  message: string;
  ipHash: string;
};

export function createLead(db: Db, data: NewLead) {
  return db.lead.create({ data, select: { id: true } });
}

export function listLeadsForUser(db: Db, userId: string, status: LeadStatus | null) {
  return db.lead.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      eventType: true,
      eventDate: true,
      message: true,
      status: true,
      clientId: true,
      createdAt: true,
    },
  });
}

export function countLeadsByStatus(db: Db, userId: string) {
  return db.lead.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } });
}

export function findOwnedLead(db: Db, userId: string, leadId: string) {
  return db.lead.findFirst({ where: { id: leadId, userId } });
}

export function updateLead(db: Db, leadId: string, data: { status?: LeadStatus; clientId?: string }) {
  return db.lead.update({ where: { id: leadId }, data, select: { id: true } });
}

export function deleteLead(db: Db, leadId: string) {
  return db.lead.delete({ where: { id: leadId } });
}
