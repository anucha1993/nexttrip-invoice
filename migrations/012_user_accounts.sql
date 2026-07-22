-- Migration: user_accounts (identity linked to tour-api; permissions stay local)
-- Created: 2026-07-20
--
-- Phase A of the auth refactor:
--   * Authentication is delegated to tour-api (its /api/auth/login).
--   * This table only links a tour-api user to invoice-local permissions
--     (profileId -> profiles). No password column (auth is remote).
--   * quotations.createdById / invoices.createdById are DECOUPLED from the
--     old `users` FK (the constraints are dropped by the runner script) and
--     now hold a user_accounts.id or the sentinel 'system'.
--
-- NOTE: the FK-constraint drop on quotations/invoices is done by
--       scripts/_apply_user_accounts.mjs because the constraint names are
--       generated and must be discovered via information_schema.

CREATE TABLE IF NOT EXISTS user_accounts (
  id         VARCHAR(191) PRIMARY KEY,
  externalId INT DEFAULT NULL COMMENT 'tour-api users.id',
  email      VARCHAR(191) NOT NULL,
  name       VARCHAR(191) NOT NULL,
  role       VARCHAR(191) DEFAULT NULL COMMENT 'tour-api role snapshot (admin/sale/it)',
  profileId  VARCHAR(191) DEFAULT NULL COMMENT 'invoice permission profile (profiles.id)',
  isActive   TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'invoice-side access toggle',
  createdAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_accounts_externalId (externalId),
  UNIQUE KEY uq_user_accounts_email (email),
  INDEX idx_user_accounts_profileId (profileId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sentinel account so 'system'-created records (auto quotations, etc.) resolve.
INSERT IGNORE INTO user_accounts (id, externalId, email, name, role, profileId, isActive, createdAt, updatedAt)
VALUES ('system', NULL, 'system@nexttrip.local', 'System', NULL, NULL, 1, NOW(), NOW());
