-- Reset all user passwords to admin123
UPDATE "User" SET
  "passwordHash" = '$2b$10$DqHtdO/DjSHU9GP7HVceIe8gGQ/kWCfv.w2vsX2qIgMen4uWIgCxi',
  "updatedAt" = NOW();

SELECT email, name, role, active FROM "User";
