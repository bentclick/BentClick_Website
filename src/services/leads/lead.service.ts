import "server-only";
import { after } from "next/server";
import type { LeadStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { CATEGORY_LABELS } from "@/lib/constants/collection";
import { clientIpHash } from "@/lib/security/client-ip";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import type { LeadInput } from "@/lib/validation/lead";
import { findClientByEmail } from "@/services/clients/client.repository";
import { createClientRecord } from "@/services/clients/client.service";
import { notifyLeadReceived } from "@/services/email/email.service";
import { DomainError, NotFoundError } from "@/services/errors";
import { findSiteOwnerProfile } from "@/services/site/site.repository";
import type { LeadCounts, LeadItem } from "@/types/lead";
import { countLeadsByStatus, createLead, deleteLead, findOwnedLead, listLeadsForUser, updateLead } from "./lead.repository";

/** Messages per visitor IP, and per day for the whole site (each one e-mails the photographer). */
const LEADS_PER_IP_PER_HOUR = 5;
const LEADS_PER_DAY = 200;

/**
 * Public contact form. A filled honeypot is accepted silently (bots see success, nothing is stored).
 * Leads belong to the site owner — the visitor never chooses who receives them.
 */
export async function submitLead(input: LeadInput): Promise<void> {
  if (input.website) return;
  const owner = await findSiteOwnerProfile(prisma);
  if (!owner) throw new DomainError("SITE_NOT_READY", "O formulário ainda não está disponível.");

  const ipHash = await clientIpHash();
  await enforceRateLimit(`lead:ip:${ipHash}`, LEADS_PER_IP_PER_HOUR, 3600);
  await enforceRateLimit(`lead:day:${owner.userId}`, LEADS_PER_DAY, 86_400);

  await createLead(prisma, {
    userId: owner.userId,
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone || null,
    eventType: input.eventType || null,
    eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00Z`) : null,
    message: input.message,
    ipHash,
  });
  after(() =>
    notifyLeadReceived(owner.userId, {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      event: [input.eventType ? CATEGORY_LABELS[input.eventType] : null, input.eventDate ? input.eventDate.split("-").reverse().join("/") : null].filter(Boolean).join(" · ") || null,
      message: input.message,
    }),
  );
}

export async function listLeads(userId: string, status: LeadStatus | null): Promise<{ leads: LeadItem[]; counts: LeadCounts }> {
  const [rows, grouped] = await Promise.all([listLeadsForUser(prisma, userId, status), countLeadsByStatus(prisma, userId)]);
  const counts: LeadCounts = { NEW: 0, CONTACTED: 0, ARCHIVED: 0 };
  for (const g of grouped) counts[g.status] = g._count._all;
  return {
    counts,
    leads: rows.map((r) => ({
      ...r,
      eventDate: r.eventDate?.toISOString().slice(0, 10) ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function countNewLeads(userId: string): Promise<number> {
  return prisma.lead.count({ where: { userId, status: "NEW" } });
}

async function owned(userId: string, leadId: string) {
  const lead = await findOwnedLead(prisma, userId, leadId);
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}

export async function setLeadStatus(userId: string, leadId: string, status: LeadStatus) {
  const lead = await owned(userId, leadId);
  await updateLead(prisma, lead.id, { status });
}

export async function removeLead(userId: string, leadId: string) {
  const lead = await owned(userId, leadId);
  await deleteLead(prisma, lead.id);
}

/** Creates (or links an existing) client with the lead's details; the lead is marked as answered. */
export async function convertLeadToClient(userId: string, leadId: string): Promise<{ clientId: string }> {
  const lead = await owned(userId, leadId);
  if (lead.clientId) return { clientId: lead.clientId };
  const existing = await findClientByEmail(prisma, userId, lead.email);
  const clientId =
    existing?.id ??
    (
      await createClientRecord(userId, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? "",
        notes: `Contato pelo site em ${lead.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}:\n${lead.message}`.slice(0, 2000),
      })
    ).id;
  await updateLead(prisma, lead.id, { clientId, status: lead.status === "NEW" ? "CONTACTED" : lead.status });
  return { clientId };
}
