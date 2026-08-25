import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("configs", (table) => {
    table.integer("current_revision").notNullable().defaultTo(1);
  });

  await knex.schema.createTable("config_revisions", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("config_id").notNullable().references("id").inTable("configs").onDelete("CASCADE");
    table.string("environment", 64).notNullable();
    table.string("key", 256).notNullable();
    table.integer("revision").notNullable();
    table.jsonb("value").notNullable();
    table.boolean("encrypted").notNullable().defaultTo(false);
    table.boolean("validated").notNullable().defaultTo(true);
    table.string("created_by", 128).notNullable();
    table.text("change_reason").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["config_id", "revision"]);
    table.index(["environment", "key", "revision"], "config_revisions_lookup_idx");
  });

  await knex.raw(`
    INSERT INTO config_revisions
      (config_id, environment, key, revision, value, encrypted, validated, created_by, change_reason, created_at)
    SELECT
      id, environment, key, 1, value, encrypted, validated,
      COALESCE(changed_by, created_by), 'Initial revision backfill', COALESCE(changed_at, created_at)
    FROM configs
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("config_revisions");
  await knex.schema.alterTable("configs", (table) => {
    table.dropColumn("current_revision");
  });
}
