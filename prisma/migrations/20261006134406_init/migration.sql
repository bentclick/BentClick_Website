-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollectionCategory" AS ENUM ('WEDDING', 'ENGAGEMENT', 'BIRTHDAY', 'CORPORATE', 'GRADUATION', 'PORTRAIT', 'FAMILY', 'OTHER');

-- CreateEnum
CREATE TYPE "DownloadQuality" AS ENUM ('ORIGINAL', 'HIGH_RES', 'WEB');

-- CreateEnum
CREATE TYPE "GalleryLayout" AS ENUM ('MASONRY', 'EDITORIAL', 'GRID');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "WatermarkType" AS ENUM ('TEXT', 'IMAGE');

-- CreateEnum
CREATE TYPE "WatermarkPosition" AS ENUM ('CENTER', 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT');

-- CreateEnum
CREATE TYPE "DownloadKind" AS ENUM ('PHOTO', 'ALL', 'FAVORITES', 'GALLERY');

-- CreateEnum
CREATE TYPE "DownloadJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('PHOTOGRAPHER', 'CLIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('GALLERY_VIEWED', 'PHOTO_FAVORITED', 'PHOTO_UNFAVORITED', 'SELECTION_SUBMITTED', 'PHOTO_DOWNLOADED', 'ARCHIVE_DOWNLOADED', 'EMAIL_SENT', 'COLLECTION_PUBLISHED', 'COLLECTION_UNPUBLISHED', 'COLLECTION_ARCHIVED', 'COLLECTION_EXPIRED', 'EXPIRATION_CHANGED', 'LINK_REGENERATED', 'LINK_DISABLED', 'PASSWORD_CHANGED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographer_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "tagline" TEXT,
    "bio" TEXT,
    "logoKey" TEXT,
    "faviconKey" TEXT,
    "websiteUrl" TEXT,
    "instagram" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#A27B5C',
    "serifFont" TEXT NOT NULL DEFAULT 'cormorant',
    "sansFont" TEXT NOT NULL DEFAULT 'geist',
    "defaultExpiryDays" INTEGER,
    "defaultAllowFavorites" BOOLEAN NOT NULL DEFAULT true,
    "defaultAllowIndividualDownload" BOOLEAN NOT NULL DEFAULT true,
    "defaultAllowFullDownload" BOOLEAN NOT NULL DEFAULT false,
    "defaultAllowSharing" BOOLEAN NOT NULL DEFAULT true,
    "defaultDownloadQuality" "DownloadQuality" NOT NULL DEFAULT 'HIGH_RES',
    "defaultLayout" "GalleryLayout" NOT NULL DEFAULT 'EDITORIAL',
    "defaultWatermarkId" TEXT,
    "replyToEmail" TEXT,
    "emailSignature" TEXT,
    "storageQuotaBytes" BIGINT NOT NULL DEFAULT 107374182400,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photographer_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATE,
    "category" "CollectionCategory" NOT NULL DEFAULT 'OTHER',
    "status" "CollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "linkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "accessVersion" INTEGER NOT NULL DEFAULT 1,
    "allowFavorites" BOOLEAN NOT NULL DEFAULT true,
    "allowIndividualDownload" BOOLEAN NOT NULL DEFAULT true,
    "allowFullDownload" BOOLEAN NOT NULL DEFAULT false,
    "allowSharing" BOOLEAN NOT NULL DEFAULT true,
    "requireClientIdentity" BOOLEAN NOT NULL DEFAULT false,
    "downloadQuality" "DownloadQuality" NOT NULL DEFAULT 'HIGH_RES',
    "layout" "GalleryLayout" NOT NULL DEFAULT 'EDITORIAL',
    "coverPhotoId" TEXT,
    "watermarkId" TEXT,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "dominantColor" TEXT,
    "storageKey" TEXT NOT NULL,
    "previewKey" TEXT,
    "thumbnailKey" TEXT,
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "failureReason" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "takenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_session" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "accessVersion" INTEGER NOT NULL,
    "passwordOk" BOOLEAN NOT NULL DEFAULT false,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "selectionSubmittedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "clientSessionId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "photoId" TEXT,
    "clientSessionId" TEXT,
    "downloadJobId" TEXT,
    "kind" "DownloadKind" NOT NULL,
    "quality" "DownloadQuality" NOT NULL,
    "bytes" BIGINT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_job" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "galleryId" TEXT,
    "clientSessionId" TEXT,
    "requestedByUserId" TEXT,
    "type" "DownloadKind" NOT NULL,
    "quality" "DownloadQuality" NOT NULL,
    "status" "DownloadJobStatus" NOT NULL DEFAULT 'QUEUED',
    "zipStorageKey" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "expiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watermark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WatermarkType" NOT NULL,
    "text" TEXT,
    "imageStorageKey" TEXT,
    "color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "size" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "position" "WatermarkPosition" NOT NULL DEFAULT 'CENTER',
    "margin" INTEGER NOT NULL DEFAULT 32,
    "tile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watermark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT,
    "clientId" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT,
    "clientSessionId" TEXT,
    "actorType" "ActorType" NOT NULL,
    "type" "ActivityType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_album" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_image" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "previewKey" TEXT,
    "thumbnailKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" BIGINT NOT NULL,
    "caption" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_bucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_bucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "photographer_profile_userId_key" ON "photographer_profile"("userId");

-- CreateIndex
CREATE INDEX "client_userId_name_idx" ON "client"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "client_userId_email_key" ON "client"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "collection_slug_key" ON "collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "collection_coverPhotoId_key" ON "collection"("coverPhotoId");

-- CreateIndex
CREATE INDEX "collection_userId_status_updatedAt_idx" ON "collection"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "collection_userId_eventDate_idx" ON "collection"("userId", "eventDate");

-- CreateIndex
CREATE INDEX "collection_status_expiresAt_idx" ON "collection"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "gallery_collectionId_sortOrder_idx" ON "gallery"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "photo_storageKey_key" ON "photo"("storageKey");

-- CreateIndex
CREATE INDEX "photo_galleryId_status_sortOrder_idx" ON "photo"("galleryId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "photo_collectionId_status_idx" ON "photo"("collectionId", "status");

-- CreateIndex
CREATE INDEX "photo_userId_idx" ON "photo"("userId");

-- CreateIndex
CREATE INDEX "photo_status_createdAt_idx" ON "photo"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_session_tokenHash_key" ON "client_session"("tokenHash");

-- CreateIndex
CREATE INDEX "client_session_collectionId_createdAt_idx" ON "client_session"("collectionId", "createdAt");

-- CreateIndex
CREATE INDEX "favorite_collectionId_clientSessionId_idx" ON "favorite"("collectionId", "clientSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_clientSessionId_photoId_key" ON "favorite"("clientSessionId", "photoId");

-- CreateIndex
CREATE INDEX "download_collectionId_createdAt_idx" ON "download"("collectionId", "createdAt");

-- CreateIndex
CREATE INDEX "download_job_status_createdAt_idx" ON "download_job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "download_job_collectionId_createdAt_idx" ON "download_job"("collectionId", "createdAt");

-- CreateIndex
CREATE INDEX "watermark_userId_idx" ON "watermark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_log_providerMessageId_key" ON "email_log"("providerMessageId");

-- CreateIndex
CREATE INDEX "email_log_userId_createdAt_idx" ON "email_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_log_collectionId_type_createdAt_idx" ON "activity_log"("collectionId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "activity_log_userId_createdAt_idx" ON "activity_log"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_album_userId_slug_key" ON "portfolio_album"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_image_storageKey_key" ON "portfolio_image"("storageKey");

-- CreateIndex
CREATE INDEX "portfolio_image_albumId_sortOrder_idx" ON "portfolio_image"("albumId", "sortOrder");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographer_profile" ADD CONSTRAINT "photographer_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_watermarkId_fkey" FOREIGN KEY ("watermarkId") REFERENCES "watermark"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery" ADD CONSTRAINT "gallery_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_session" ADD CONSTRAINT "client_session_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_clientSessionId_fkey" FOREIGN KEY ("clientSessionId") REFERENCES "client_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download" ADD CONSTRAINT "download_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download" ADD CONSTRAINT "download_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download" ADD CONSTRAINT "download_clientSessionId_fkey" FOREIGN KEY ("clientSessionId") REFERENCES "client_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download" ADD CONSTRAINT "download_downloadJobId_fkey" FOREIGN KEY ("downloadJobId") REFERENCES "download_job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_job" ADD CONSTRAINT "download_job_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_job" ADD CONSTRAINT "download_job_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "gallery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_job" ADD CONSTRAINT "download_job_clientSessionId_fkey" FOREIGN KEY ("clientSessionId") REFERENCES "client_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermark" ADD CONSTRAINT "watermark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_clientSessionId_fkey" FOREIGN KEY ("clientSessionId") REFERENCES "client_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_album" ADD CONSTRAINT "portfolio_album_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_image" ADD CONSTRAINT "portfolio_image_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "portfolio_album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
