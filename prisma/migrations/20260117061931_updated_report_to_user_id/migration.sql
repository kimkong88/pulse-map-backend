/*
  Warnings:

  - The values [access] on the enum `TokenType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `accountId` on the `Report` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TokenType_new" AS ENUM ('refresh');
ALTER TABLE "Token" ALTER COLUMN "type" TYPE "TokenType_new" USING ("type"::text::"TokenType_new");
ALTER TYPE "TokenType" RENAME TO "TokenType_old";
ALTER TYPE "TokenType_new" RENAME TO "TokenType";
DROP TYPE "public"."TokenType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_accountId_fkey";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "accountId",
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
