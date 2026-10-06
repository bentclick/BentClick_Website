import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { Db } from "@/lib/db/types";
import type { CreateCollectionInput } from "@/lib/validation/collection";
import { NotFoundError } from "@/services/errors";
import type { ClientOption } from "@/types/client";
import { createClient, findClientByEmail, findOwnedClient, listClientsForUser } from "./client.repository";

export async function listClientOptions(userId: string): Promise<ClientOption[]> {
  const clients = await listClientsForUser(prisma, userId);
  return clients.map(({ id, name, email }) => ({ id, name, email }));
}

export async function listClients(userId: string) {
  const clients = await listClientsForUser(prisma, userId);
  return clients.map((c) => ({ id: c.id, name: c.name, email: c.email, collectionCount: c._count.collections }));
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
