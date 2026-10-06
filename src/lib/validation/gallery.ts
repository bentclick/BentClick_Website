import { z } from "zod";

export const galleryNameSchema = z.string().trim().min(1, "Informe o nome da galeria").max(60, "Use até 60 caracteres");

export const createGallerySchema = z.object({ collectionId: z.cuid(), name: galleryNameSchema });
export const renameGallerySchema = z.object({ galleryId: z.cuid(), name: galleryNameSchema });
export const galleryIdSchema = z.cuid();
export const photoIdsSchema = z.array(z.cuid()).min(1).max(500);
