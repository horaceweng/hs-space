-- Add role column to AdminUsers table, default to 'teacher'
ALTER TABLE AdminUsers ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher';

-- Set the user 'admin' to have the 'admin' role
UPDATE AdminUsers SET role = 'admin' WHERE username = 'admin';
