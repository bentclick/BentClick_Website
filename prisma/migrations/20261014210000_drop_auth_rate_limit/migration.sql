-- Auth rate limits now share the atomic "rate_limit_bucket" table.
DROP TABLE IF EXISTS "auth_rate_limit";
