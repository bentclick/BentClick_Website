-- AlterTable
ALTER TABLE "portfolio_image" ADD COLUMN     "dominantColor" TEXT,
ADD COLUMN     "filename" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
ADD COLUMN     "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING_UPLOAD';

-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_content_userId_key" ON "site_content"("userId");

-- CreateIndex
CREATE INDEX "portfolio_image_albumId_status_idx" ON "portfolio_image"("albumId", "status");

-- AddForeignKey
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
