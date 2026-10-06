import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { Db } from "@/lib/db/types";
import type { CreateCollectionInput } from "@/lib/validation/collection";
import type { ClientInput } from "@/lib/validation/settings";
import { DomainError, NotFoundError } from "@/services/errors";
import type { ClientOption } from "@/types/client";
import { createClient, deleteClient, findClientByEmail, findOwnedClient, listClientsForUser, updateClient } from "./client.repository";

export async function listClientOptions(userId: string): Promise<ClientOption[]> {
  const clients = await listClientsForUser(prisma, userId);
  return clients.map(({ id, name, email }) => ({ id, name, email }));
}

export async function listClients(userId: string) {
  const clients = await listClientsForUser(prisma, userId);
  return clients.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, notes: c.notes, collectionCount: c._count.collections }));
}

/**
 * Resolves the client chosen in the collection form to a client id owned by
 * `userId`. A "new" client with an email that already exists is reused.
 */
export async function resolveClientId(db: Db, userId: string, input: CreateCollectionInput["client"]): Promise<string | null> {
  switch (input.mode) {
    case "none":
      return null;
    case "existing": {
      const client = await findOwnedClient(db, userId, input.clientId);
      if (!client) throw new NotFoundError("Client");
      return client.id;
    }
    case "new": {
      const email = input.email ? input.email.toLowerCase() : null;
      if (email) {
        const existing = await findClientByEmail(db, userId, email);
        if (existing) return existing.id;
      }
      const created = await createClient(db, { userId, name: input.name, email });
      return created.id;
    }
  }
}

// ─── Client management ────────────────────────────────────────

export async function createClientRecord(userId: string, input: ClientInput) {
  const email = input.email ? input.email.toLowerCase() : null;
  if (email && (await findClientByEmail(prisma, userId, email))) {
    throw new DomainError("CLIENT_EXISTS", "Já existe um cliente com este e-mail.");
  }
  return createClient(prisma, { userId, name: input.name, email, phone: input.phone || null, notes: input.notes || null });
}

export async function updateClientRecord(userId: string, clientId: string, input: ClientInput) {
  const client = await findOwnedClient(prisma, userId, clientId);
  if (!client) throw new NotFoundError("Client");
  const email = input.email ? input.email.toLowerCase() : null;
  if (email) {
    const other = await findClientByEmail(prisma, userId, email);
    if (other && other.id !== client.id) throw new DomainError("CLIENT_EXISTS", "Já existe um cliente com este e-mail.");
  }
  await updateClient(prisma, client.id, { name: input.name, email, phone: input.phone || null, notes: input.notes || null });
}

/** Collections keep existing; they just lose the client link. */
export async function deleteClientRecord(userId: string, clientId: string) {
  const client = await findOwnedClient(prisma, userId, clientId);
  if (!client) throw new NotFoundError("Client");
  await deleteClient(prisma, client.id);
}
