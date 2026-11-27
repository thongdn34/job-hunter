-- Generated from prisma/migrations/20261126172050_init/migration.sql by scripts/sync-d1-migrations.mjs. Do not edit.
-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "targetRoles" JSONB NOT NULL,
    "workingArrangement" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "cvText" TEXT,
    "cvFileName" TEXT,
    "cvUploadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "highlights" JSONB NOT NULL,
    "technologies" JSONB NOT NULL,
    "includeInGeneration" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkExperience_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnicalSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "proficiency" TEXT NOT NULL DEFAULT 'production',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicalSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "appliedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "origin" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalized" JSONB NOT NULL,
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobDescription_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "packageId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'web',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "accessedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchSource_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "run" TEXT NOT NULL DEFAULT 'RUN_10',
    "applicationId" TEXT,
    "companyName" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InterviewPackage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "content" JSONB,
    "error" TEXT,
    "inputHash" TEXT,
    "model" TEXT,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PackageSection_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    CONSTRAINT "InterviewTopic_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "topicId" TEXT,
    "difficulty" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InterviewQuestion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InterviewQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "InterviewTopic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    CONSTRAINT "FollowUpQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CodingExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "CodingExercise_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemDesignScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "SystemDesignScenario_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BehavioralQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "BehavioralQuestion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    CONSTRAINT "Flashcard_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "StudyPlan_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyProgress_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MockInterviewSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "averageScore" REAL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "MockInterviewSession_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MockInterviewAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "revealedBeforeSubmit" BOOLEAN NOT NULL DEFAULT false,
    "overall" REAL NOT NULL,
    "evaluation" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MockInterviewAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MockInterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sections" JSONB NOT NULL,
    "progress" JSONB NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "error" TEXT,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    CONSTRAINT "GenerationJob_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InterviewPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "language" TEXT NOT NULL DEFAULT 'bilingual',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "includeElfie" BOOLEAN NOT NULL DEFAULT false,
    "lastPackageSlug" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "WorkExperience_profileId_idx" ON "WorkExperience"("profileId");

-- CreateIndex
CREATE INDEX "TechnicalSkill_profileId_idx" ON "TechnicalSkill"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalSkill_profileId_name_key" ON "TechnicalSkill"("profileId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE INDEX "JobApplication_companyId_idx" ON "JobApplication"("companyId");

-- CreateIndex
CREATE INDEX "JobDescription_applicationId_idx" ON "JobDescription"("applicationId");

-- CreateIndex
CREATE INDEX "ResearchSource_companyId_idx" ON "ResearchSource"("companyId");

-- CreateIndex
CREATE INDEX "ResearchSource_packageId_idx" ON "ResearchSource"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPackage_slug_key" ON "InterviewPackage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PackageSection_packageId_key_key" ON "PackageSection"("packageId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTopic_packageId_topicKey_key" ON "InterviewTopic"("packageId", "topicKey");

-- CreateIndex
CREATE INDEX "InterviewQuestion_packageId_number_idx" ON "InterviewQuestion"("packageId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewQuestion_packageId_itemId_key" ON "InterviewQuestion"("packageId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpQuestion_questionId_itemId_key" ON "FollowUpQuestion"("questionId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingExercise_packageId_itemId_key" ON "CodingExercise"("packageId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemDesignScenario_packageId_itemId_key" ON "SystemDesignScenario"("packageId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "BehavioralQuestion_packageId_itemId_key" ON "BehavioralQuestion"("packageId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Flashcard_packageId_itemId_key" ON "Flashcard"("packageId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlan_packageId_planKey_key" ON "StudyPlan"("packageId", "planKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudyProgress_packageId_key" ON "StudyProgress"("packageId");

-- CreateIndex
CREATE INDEX "MockInterviewSession_packageId_idx" ON "MockInterviewSession"("packageId");

-- CreateIndex
CREATE INDEX "MockInterviewAnswer_sessionId_idx" ON "MockInterviewAnswer"("sessionId");

-- CreateIndex
CREATE INDEX "GenerationJob_packageId_idx" ON "GenerationJob"("packageId");
