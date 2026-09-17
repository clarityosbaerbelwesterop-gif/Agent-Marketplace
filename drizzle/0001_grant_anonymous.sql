-- Allow the privileged login role (typically neondb_owner) to SET LOCAL ROLE
-- anonymous for public catalog queries. Idempotent if already granted.
GRANT anonymous TO CURRENT_USER;
