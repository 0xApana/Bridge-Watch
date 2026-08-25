import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("operational_change_requests", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("change_type", 100).notNullable();
    table.string("environment", 64).notNullable();
    table.string("summary", 200).notNullable();
    table.text("description").notNullable();
    table.jsonb("payload").notNullable().defaultTo("{}");
    table.string("proposed_by", 128).notNullable();
    table.string("status", 24).notNullable().defaultTo("pending");
    table.integer("required_approvals").notNullable().defaultTo(1);
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.integer("version").notNullable().defaultTo(1);
    table.timestamp("approved_at", { useTz: true });
    table.timestamp("executed_at", { useTz: true });
    table.string("executed_by", 128);
    table.timestamps(true, true);
    table.index(["environment", "status"]);
    table.index("expires_at");
  });

  await knex.schema.createTable("operational_change_approvals", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("change_request_id").notNullable().references("id").inTable("operational_change_requests").onDelete("CASCADE");
    table.string("approver", 128).notNullable();
    table.string("decision", 16).notNullable();
    table.text("comment");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["change_request_id", "approver"]);
    table.index("change_request_id");
  });

  await knex.schema.createTable("error_catalog_entries", (table) => {
    table.bigIncrements("id").primary();
    table.string("code", 128).notNullable();
    table.integer("version").notNullable();
    table.string("severity", 16).notNullable().defaultTo("error");
    table.string("http_status", 3).notNullable().defaultTo("500");
    table.text("message_template").notNullable();
    table.text("remediation").notNullable();
    table.boolean("retryable").notNullable().defaultTo(false);
    table.boolean("active").notNullable().defaultTo(true);
    table.string("updated_by", 128).notNullable();
    table.timestamps(true, true);
    table.unique(["code", "version"]);
    table.index(["code", "active"]);
  });

  await knex.schema.createTable("request_sampling_policies", (table) => {
    table.bigIncrements("id").primary();
    table.string("environment", 64).notNullable();
    table.string("route_pattern", 200).notNullable();
    table.decimal("sample_rate", 5, 4).notNullable();
    table.boolean("enabled").notNullable().defaultTo(true);
    table.string("updated_by", 128).notNullable();
    table.timestamps(true, true);
    table.unique(["environment", "route_pattern"]);
    table.index(["environment", "enabled"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("request_sampling_policies");
  await knex.schema.dropTableIfExists("error_catalog_entries");
  await knex.schema.dropTableIfExists("operational_change_approvals");
  await knex.schema.dropTableIfExists("operational_change_requests");
}
