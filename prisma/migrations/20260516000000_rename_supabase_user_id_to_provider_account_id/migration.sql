-- Rename supabaseUserId → providerAccountId (Supabase → NextAuth migration)
ALTER TABLE "User" RENAME COLUMN "supabaseUserId" TO "providerAccountId";
