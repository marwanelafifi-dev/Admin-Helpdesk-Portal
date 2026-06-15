UPDATE "User" SET role = 'super_admin', active = true, "updatedAt" = NOW()
WHERE email = 'marwan.elafifi@si-ware.com';
SELECT email, name, role, active FROM "User" WHERE email = 'marwan.elafifi@si-ware.com';
