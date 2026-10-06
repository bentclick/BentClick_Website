import { z } from "zod";

/** Every entity id in the app is a cuid; ids from the browser are parsed with this. */
export const idSchema = z.cuid();
