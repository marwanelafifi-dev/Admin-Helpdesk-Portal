-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequestStatus" ADD VALUE 'pending_assignment';
ALTER TYPE "RequestStatus" ADD VALUE 'assigned';
ALTER TYPE "RequestStatus" ADD VALUE 'awaiting_input';
ALTER TYPE "RequestStatus" ADD VALUE 'resolved';
ALTER TYPE "RequestStatus" ADD VALUE 'closed';
