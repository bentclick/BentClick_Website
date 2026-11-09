-- Edited version of a photo; the stored original is never changed.
ALTER TABLE "photo" ADD COLUMN "editedKey" TEXT,
ADD COLUMN "editedFilename" TEXT,
ADD COLUMN "editedMimeType" TEXT,
ADD COLUMN "editedFileSize" BIGINT,
ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "pendingEdit" JSONB;

CREATE UNIQUE INDEX "photo_editedKey_key" ON "photo"("editedKey");
