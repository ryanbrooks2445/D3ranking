-- AlterTable: add stripeCustomerId and unique email for User (auth + subscription link)
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
