/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'manager', 'employee', 'external');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'employee';
