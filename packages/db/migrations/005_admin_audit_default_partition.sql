-- Up
-- Default partition for admin_audit: unblocks writes until monthly partitions are provisioned by ops.
CREATE TABLE admin_audit_default PARTITION OF admin_audit DEFAULT;

-- Down
DROP TABLE IF EXISTS admin_audit_default;
