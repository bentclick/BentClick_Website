-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "photographer_profile" ADD COLUMN     "portraitHeight" INTEGER,
ADD COLUMN     "portraitKey" TEXT,
ADD COLUMN     "portraitWidth" INTEGER;

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "eventType" "CollectionCategory",
    "eventDate" DATE,
    "message" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "clientId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_userId_status_createdAt_idx" ON "lead"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
