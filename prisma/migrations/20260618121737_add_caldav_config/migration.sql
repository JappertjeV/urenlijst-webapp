-- CreateTable
CREATE TABLE "CaldavConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "appleId" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "calendarUrl" TEXT,
    "calendarName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaldavConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CaldavConfig_userId_key" ON "CaldavConfig"("userId");
