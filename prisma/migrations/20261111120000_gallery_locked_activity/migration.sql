-- Visitors locked a gallery out with wrong passwords: shown in the activity log and e-mailed to the photographer.
ALTER TYPE "ActivityType" ADD VALUE 'GALLERY_LOCKED';
