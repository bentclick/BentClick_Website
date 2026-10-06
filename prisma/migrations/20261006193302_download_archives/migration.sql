-- AlterTable
ALTER TABLE "download_job" ADD COLUMN     "fingerprint" TEXT;

-- CreateTable
CREATE TABLE "download_archive_part" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "status" "DownloadJobStatus" NOT NULL DEFAULT 'QUEUED',
    "photoIds" TEXT[],
    "bytes" BIGINT NOT NULL DEFAULT 0,
    "zipStorageKey" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "download_archive_part_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "download_archive_part_status_startedAt_idx" ON "download_archive_part"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "download_archive_part_jobId_index_key" ON "download_archive_part"("jobId", "index");

-- CreateIndex
CREATE INDEX "download_job_collectionId_fingerprint_idx" ON "download_job"("collectionId", "fingerprint");

-- AddForeignKey
ALTER TABLE "download_archive_part" ADD CONSTRAINT "download_archive_part_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "download_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
