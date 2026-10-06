-- CreateEnum
CREATE TYPE "PortfolioCategory" AS ENUM ('WEDDING', 'EVENT', 'SESSION', 'PEOPLE', 'CORPORATE', 'TRAVEL', 'PRODUCT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CollectionCategory" ADD VALUE 'EVENT';
ALTER TYPE "CollectionCategory" ADD VALUE 'SESSION';
ALTER TYPE "CollectionCategory" ADD VALUE 'PRODUCT';
ALTER TYPE "CollectionCategory" ADD VALUE 'TRAVEL';

-- AlterTable
ALTER TABLE "photographer_profile" ADD COLUMN     "professionalTitle" TEXT NOT NULL DEFAULT 'Fotógrafo';

-- AlterTable
ALTER TABLE "portfolio_album" ADD COLUMN     "category" "PortfolioCategory" NOT NULL DEFAULT 'PEOPLE';

-- CreateIndex
CREATE INDEX "portfolio_album_userId_isPublished_category_idx" ON "portfolio_album"("userId", "isPublished", "category");
