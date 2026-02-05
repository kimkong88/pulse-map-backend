-- CreateTable
CREATE TABLE "Blessing" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "message" TEXT,
    "receivedById" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blessing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blessing_receivedById_expiresAt_idx" ON "Blessing"("receivedById", "expiresAt");

-- CreateIndex
CREATE INDEX "Blessing_sentById_createdAt_idx" ON "Blessing"("sentById", "createdAt");

-- AddForeignKey
ALTER TABLE "Blessing" ADD CONSTRAINT "Blessing_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blessing" ADD CONSTRAINT "Blessing_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
