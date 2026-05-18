-- Clear existing roles
DELETE FROM "Role";

-- Insert the 4 correct roles
INSERT INTO "Role" (id, name, description, permissions, "createdAt", "updatedAt") VALUES
(
  gen_random_uuid(),
  'Administration Team',
  'Full administrative access to all modules and settings',
  ARRAY['*'],
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'HR Team',
  'Access to HR module, onboarding/offboarding, and employee requests',
  ARRAY[
    'page:dashboard','page:all-requests','page:my-requests','page:request-detail',
    'page:hr','page:hr-new','page:shipping','page:shipping-new','page:shipping-receiving',
    'page:maintenance','page:purchase','page:purchase-new','page:event','page:travel',
    'update_status','edit_request','cancel_request'
  ],
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Full Access',
  'Full access to all modules and requests',
  ARRAY[
    'page:dashboard','page:all-requests','page:my-requests','page:request-detail',
    'page:shipping','page:shipping-new','page:shipping-sending','page:shipping-receiving',
    'page:hr','page:hr-new','page:maintenance','page:maintenance-new',
    'page:purchase','page:purchase-new','page:event','page:travel',
    'page:admin-users','page:admin-settings',
    'manage_users','update_status','edit_request','cancel_request'
  ],
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Requester',
  'Can submit and track their own requests',
  ARRAY[
    'page:dashboard','page:my-requests','page:request-detail',
    'page:shipping','page:shipping-receiving',
    'page:purchase','page:purchase-new','page:travel'
  ],
  NOW(), NOW()
);

-- Update users to use correct role names
UPDATE "User" SET role = 'Administration Team', "updatedAt" = NOW()
WHERE role IN ('super_admin', 'admin', 'manager');

UPDATE "User" SET role = 'Requester', "updatedAt" = NOW()
WHERE role = 'requester';

SELECT * FROM "Role" ORDER BY "createdAt";
SELECT email, name, role, active FROM "User";
