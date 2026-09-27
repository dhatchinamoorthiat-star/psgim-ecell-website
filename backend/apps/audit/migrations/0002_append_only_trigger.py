# Database-level enforcement for the audit log (review finding F8).
#
# apps.audit.models.AuditLog already refuses UPDATE/DELETE at the application
# layer (AppendOnlyError). That protects every code path that goes through
# Django, but nothing stops a different code path — a raw SQL client, a
# future maintenance script, a role with direct database access — from
# writing to the table underneath the ORM.
#
# The natural DB-level fix, REVOKE UPDATE/DELETE FROM <app role>, does NOT
# work here: PostgreSQL table owners always retain implicit privileges on
# their own tables, and REVOKE cannot take those away. In this architecture
# the same DATABASE_URL role runs migrations and normal queries, so it owns
# every table it creates — a migration-time REVOKE would silently be a
# no-op in production while appearing to pass locally in whatever role ran
# `manage.py migrate`.
#
# WHAT THIS DOES AND DOES NOT GUARANTEE (corrected after a second security
# review of the first version of this migration, which overstated the
# guarantee — see PHASE_1_IMPLEMENTATION_NOTES.md §10 and
# docs/09_AUDIT_LOG_SPECIFICATION.md for the corrected, precise wording):
#
#   - Protects against ordinary DML, from ANY role including the table
#     owner. PostgreSQL fires BEFORE UPDATE/DELETE/TRUNCATE triggers for the
#     owner exactly like any other role — a plain UPDATE, DELETE or TRUNCATE
#     statement is rejected regardless of who runs it. This is genuine
#     database-level enforcement of "no ordinary write" — verified directly
#     against PostgreSQL with raw SQL, not only through the Django ORM.
#
#   - Does NOT protect against the owning role issuing privileged DDL.
#     PostgreSQL ties `ALTER TABLE ... DISABLE TRIGGER` and `DROP TRIGGER`
#     to table ownership, not to a separate privilege that can be revoked.
#     Since this architecture's single DATABASE_URL role owns every table
#     it creates, THAT SAME ROLE CAN DISABLE OR DROP THIS TRIGGER WITH THE
#     SAME CREDENTIALS THE APPLICATION USES — this was verified directly
#     (`ALTER TABLE audit_auditlog DISABLE TRIGGER audit_auditlog_no_delete;`
#     followed by a plain DELETE succeeds). No trigger, and no migration,
#     can close this without a second, non-owning database role — which
#     does not exist in this project and is out of scope here (it would be
#     a deployment/architecture decision, not a migration). Treat this
#     trigger as a strong guard against ordinary application code and
#     mistakes, not as a boundary against anyone already holding the
#     application's own database credentials and willing to run DDL.
#
# A deployment-time REVOKE (see backend/scripts/harden_audit_log.sql) is
# still worth doing as defense in depth for any role that is NOT the table
# owner (e.g. a future read-only reporting role) — it has no effect on the
# owning role, for the same ownership reason as above.

from django.db import migrations

CREATE_SQL = """
CREATE FUNCTION audit_auditlog_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_auditlog is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_auditlog_no_update
    BEFORE UPDATE ON audit_auditlog
    FOR EACH ROW EXECUTE FUNCTION audit_auditlog_append_only();

CREATE TRIGGER audit_auditlog_no_delete
    BEFORE DELETE ON audit_auditlog
    FOR EACH ROW EXECUTE FUNCTION audit_auditlog_append_only();

-- TRUNCATE bypasses BEFORE UPDATE/DELETE triggers entirely (PostgreSQL never
-- fires row-level triggers for it) — a security review found that a plain
-- `TRUNCATE audit_auditlog;` wiped the table despite the two triggers above.
-- TRUNCATE triggers must be statement-level (FOR EACH STATEMENT), never
-- row-level; the same function works unchanged since it only inspects TG_OP.
CREATE TRIGGER audit_auditlog_no_truncate
    BEFORE TRUNCATE ON audit_auditlog
    FOR EACH STATEMENT EXECUTE FUNCTION audit_auditlog_append_only();
"""

DROP_SQL = """
DROP TRIGGER IF EXISTS audit_auditlog_no_update ON audit_auditlog;
DROP TRIGGER IF EXISTS audit_auditlog_no_delete ON audit_auditlog;
DROP TRIGGER IF EXISTS audit_auditlog_no_truncate ON audit_auditlog;
DROP FUNCTION IF EXISTS audit_auditlog_append_only();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(sql=CREATE_SQL, reverse_sql=DROP_SQL),
    ]
