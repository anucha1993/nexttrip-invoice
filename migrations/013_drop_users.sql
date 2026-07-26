-- Migration 013: Drop the legacy `users` table.
-- Identity now comes from tour-api (verified at login); invoice-local permissions
-- live in `user_accounts`. No other table has a foreign key referencing `users`
-- (verified via information_schema preflight), so this drop is safe.
-- The table's own FK `users_profileId_fkey` (users.profileId -> profiles.id) is
-- removed automatically together with the table.

DROP TABLE IF EXISTS `users`;
