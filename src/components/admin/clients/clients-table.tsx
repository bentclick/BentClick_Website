"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientDialog, type ClientRow } from "./client-dialog";

export function NewClientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Novo cliente
      </Button>
      {open ? <ClientDialog open onOpenChange={setOpen} /> : null}
    </>
  );
}

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [editing, setEditing] = useState<ClientRow | null>(null);

  return (
    <div className="mt-8 overflow-hidden rounded-[6px] border border-border bg-surface">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border">
          <tr className="[&>th]:eyebrow [&>th]:px-4 [&>th]:py-3">
            <th scope="col">Nome</th>
            <th scope="col" className="hidden sm:table-cell">
              E-mail
            </th>
            <th scope="col" className="hidden md:table-cell">
              Telefone
            </th>
            <th scope="col" className="text-right">
              Coleções
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr key={client.id} className="cursor-pointer transition-colors hover:bg-background/70" onClick={() => setEditing(client)}>
              <td className="px-4 py-3.5">
                <button type="button" className="text-left font-serif text-[17px]" onClick={() => setEditing(client)}>
                  {client.name}
                </button>
              </td>
              <td className="hidden px-4 py-3.5 text-muted-foreground sm:table-cell">{client.email ?? "—"}</td>
              <td className="hidden px-4 py-3.5 text-muted-foreground md:table-cell">{client.phone ?? "—"}</td>
              <td className="px-4 py-3.5 text-right tabular-nums">{client.collectionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing ? <ClientDialog key={editing.id} open onOpenChange={(o) => !o && setEditing(null)} client={editing} /> : null}
    </div>
  );
}
