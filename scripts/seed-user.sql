-- Upsert admin user (password: admin123)
INSERT INTO "User" (id, email, name, "passwordHash", role, active, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@si-ware.com',
  'Admin User',
  '$2b$10$g0T4dzwrlsclS7HcdyLiA.HgicADrboqDdAUyXCMQUv3tyXLIsyyy',
  'super_admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  "updatedAt" = NOW();
