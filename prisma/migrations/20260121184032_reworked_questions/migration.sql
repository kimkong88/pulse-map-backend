/*
  Warnings:

  - You are about to drop the column `description` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `isPremium` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Question` table. All the data in the column will be lost.
  - Added the required column `data` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `input` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('personal', 'compatibility', 'daily');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "description",
DROP COLUMN "isPremium",
DROP COLUMN "prompt",
DROP COLUMN "title",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "input" JSONB NOT NULL,
ADD COLUMN     "status" "QuestionStatus" NOT NULL,
ADD COLUMN     "type" "QuestionType" NOT NULL;
