import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';

loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

type TableVolume = {
  tableName: string;
  rowCount: number;
  totalBytes: number;
};

function escapeMarkdown(value: unknown) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

function formatBytes(bytes: number) {
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function assertSafeIdentifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  }
}

async function run() {
  const pool = new Pool({ connectionString });

  try {
    const databaseResult = await pool.query<{ databaseName: string; serverVersion: string }>(`
      select current_database() as "databaseName", current_setting('server_version') as "serverVersion"
    `);
    const tableResult = await pool.query<{ tableName: string; totalBytes: string }>(`
      select
        c.relname as "tableName",
        pg_total_relation_size(c.oid)::text as "totalBytes"
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `);

    const tables: TableVolume[] = [];
    for (const table of tableResult.rows) {
      assertSafeIdentifier(table.tableName);
      const countResult = await pool.query<{ count: number }>(
        `select count(*)::int as count from public."${table.tableName}"`,
      );
      tables.push({
        tableName: table.tableName,
        rowCount: countResult.rows[0]?.count ?? 0,
        totalBytes: Number(table.totalBytes),
      });
    }

    const columns = (
      await pool.query(`
        select
          table_name as "tableName",
          column_name as "columnName",
          data_type as "dataType",
          udt_name as "underlyingType",
          is_nullable as "isNullable",
          column_default as "defaultValue",
          ordinal_position as "position"
        from information_schema.columns
        where table_schema = 'public'
        order by table_name, ordinal_position
      `)
    ).rows;

    const constraints = (
      await pool.query(`
        select
          conrelid::regclass::text as "tableName",
          conname as "constraintName",
          contype as "constraintType",
          pg_get_constraintdef(oid, true) as definition
        from pg_constraint
        where connamespace = 'public'::regnamespace
        order by 1, 2
      `)
    ).rows;

    const indexes = (
      await pool.query(`
        select
          tablename as "tableName",
          indexname as "indexName",
          indexdef as definition
        from pg_indexes
        where schemaname = 'public'
        order by tablename, indexname
      `)
    ).rows;

    const extensions = (
      await pool.query(`
        select extname as name, extversion as version
        from pg_extension
        order by extname
      `)
    ).rows;

    const generatedAt = new Date().toISOString();
    const database = databaseResult.rows[0];
    const inventory = {
      generatedAt,
      database,
      summary: {
        tableCount: tables.length,
        columnCount: columns.length,
        constraintCount: constraints.length,
        indexCount: indexes.length,
        extensionCount: extensions.length,
      },
      tables,
      columns,
      constraints,
      indexes,
      extensions,
    };

    const outputDirectory = path.resolve('docs', 'baseline');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      path.join(outputDirectory, 'database-inventory.json'),
      `${JSON.stringify(inventory, null, 2)}\n`,
      'utf8',
    );

    const markdown = [
      '# Inventaire PostgreSQL — baseline',
      '',
      `Généré le ${generatedAt}.`,
      '',
      `- Base : \`${escapeMarkdown(database.databaseName)}\``,
      `- PostgreSQL : \`${escapeMarkdown(database.serverVersion)}\``,
      `- Tables : ${tables.length}`,
      `- Colonnes : ${columns.length}`,
      `- Contraintes : ${constraints.length}`,
      `- Index : ${indexes.length}`,
      `- Extensions : ${extensions.length}`,
      '',
      '## Volumes',
      '',
      '| Table | Lignes | Taille totale |',
      '|---|---:|---:|',
      ...tables.map(
        (table) =>
          `| ${escapeMarkdown(table.tableName)} | ${table.rowCount} | ${formatBytes(table.totalBytes)} |`,
      ),
      '',
      '## Extensions',
      '',
      '| Extension | Version |',
      '|---|---|',
      ...extensions.map(
        (extension) =>
          `| ${escapeMarkdown(extension.name)} | ${escapeMarkdown(extension.version)} |`,
      ),
      '',
      '## Contraintes',
      '',
      '| Table | Nom | Type | Définition |',
      '|---|---|---|---|',
      ...constraints.map(
        (constraint) =>
          `| ${escapeMarkdown(constraint.tableName)} | ${escapeMarkdown(constraint.constraintName)} | ${escapeMarkdown(constraint.constraintType)} | ${escapeMarkdown(constraint.definition)} |`,
      ),
      '',
      '## Index',
      '',
      '| Table | Nom | Définition |',
      '|---|---|---|',
      ...indexes.map(
        (index) =>
          `| ${escapeMarkdown(index.tableName)} | ${escapeMarkdown(index.indexName)} | ${escapeMarkdown(index.definition)} |`,
      ),
      '',
      'Le détail complet des colonnes est disponible dans `database-inventory.json`.',
      '',
    ].join('\n');

    await writeFile(path.join(outputDirectory, 'database-inventory.md'), markdown, 'utf8');

    console.log(
      `Inventaire exporté: ${tables.length} tables, ${columns.length} colonnes, ${constraints.length} contraintes, ${indexes.length} index.`,
    );
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Erreur export inventaire PostgreSQL:', error);
  process.exit(1);
});
