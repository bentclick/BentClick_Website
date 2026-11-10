-- The gallery password, sealed so the photographer can read it again (lib/security/secret-box).
ALTER TABLE "collection" ADD COLUMN "passwordSealed" TEXT;
