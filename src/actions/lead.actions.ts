"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { leadSchema, leadStatusSchema } from "@/lib/validation/lead";
import { convertLeadToClient, removeLead, setLeadStatus, submitLead } from "@/services/leads/lead.service";

/** Public: the contact form on the website. */
export async function submitLeadAction(input: unknown): Promise<ActionResult> {
  try {
    await submitLead(leadSchema.parse(input));
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

const statusInput = z.object({ leadId: idSchema, status: leadStatusSchema });

export async function setLeadStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { leadId, status } = statusInput.parse(input);
    await setLeadStatus(user.id, leadId, status);
    revalidatePath("/dashboard/leads");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteLeadAction(leadId: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await removeLead(user.id, idSchema.parse(leadId));
    revalidatePath("/dashboard/leads");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function convertLeadAction(leadId: unknown): Promise<ActionResult<{ clientId: string }>> {
  try {
    const user = await assertUser();
    const result = await convertLeadToClient(user.id, idSchema.parse(leadId));
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/clients");
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
