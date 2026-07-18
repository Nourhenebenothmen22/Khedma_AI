-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('Junior', 'Mid', 'Senior', 'Lead', 'Executive');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('Remote', 'Hybrid', 'Onsite');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('Full-time', 'Part-time', 'Contract', 'Internship');

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seniority" "Seniority" NOT NULL DEFAULT 'Mid',
    "location" TEXT NOT NULL,
    "workType" "WorkType" NOT NULL DEFAULT 'Remote',
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'Full-time',
    "language" TEXT NOT NULL DEFAULT 'en',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "sections" JSONB NOT NULL,
    "atsKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescriptionVersion" (
    "id" TEXT NOT NULL,
    "jobDescriptionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescriptionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "UsageStat" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobDescription_isDraft_idx" ON "JobDescription"("isDraft");

-- CreateIndex
CREATE INDEX "JobDescription_updatedAt_isFavorite_idx" ON "JobDescription"("updatedAt", "isFavorite");

-- CreateIndex
CREATE INDEX "DescriptionVersion_jobDescriptionId_idx" ON "DescriptionVersion"("jobDescriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "DescriptionVersion_jobDescriptionId_versionNumber_key" ON "DescriptionVersion"("jobDescriptionId", "versionNumber");

-- AddForeignKey
ALTER TABLE "DescriptionVersion" ADD CONSTRAINT "DescriptionVersion_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
