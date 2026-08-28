import { readFile, writeFile } from 'node:fs/promises'

const inputPath = new URL('../prisma/schema.prisma', import.meta.url)
const outputPath = new URL('../docs/database.dbml', import.meta.url)
const schema = await readFile(inputPath, 'utf8')

function blocks(keyword) {
  const result = []
  const pattern = new RegExp(`^${keyword}\\s+(\\w+)\\s*\\{`, 'gm')
  let match

  while ((match = pattern.exec(schema))) {
    let depth = 1
    let cursor = pattern.lastIndex
    while (depth > 0 && cursor < schema.length) {
      if (schema[cursor] === '{') depth++
      if (schema[cursor] === '}') depth--
      cursor++
    }
    result.push({ name: match[1], body: schema.slice(pattern.lastIndex, cursor - 1) })
    pattern.lastIndex = cursor
  }

  return result
}

const enums = blocks('enum').map(({ name, body }) => ({
  name,
  values: body.split(/\r?\n/)
    .map(line => line.replace(/\/\/.*$/, '').trim())
    .filter(Boolean),
}))
const enumNames = new Set(enums.map(item => item.name))

function mappedName(line, fallback) {
  return line.match(/@map\("([^"]+)"\)/)?.[1] ?? fallback
}

function dbType(type, attributes) {
  const native = attributes.match(/@db\.([A-Za-z]+)(?:\(([^)]+)\))?/)
  if (native) {
    const [, name, args] = native
    const names = {
      Char: 'char', VarChar: 'varchar', Text: 'text', MediumText: 'mediumtext', LongText: 'longtext',
      Date: 'date', Time: 'time', DateTime: 'datetime', Timestamp: 'timestamp', Decimal: 'decimal',
      TinyInt: 'tinyint', SmallInt: 'smallint', MediumInt: 'mediumint', Int: 'int', BigInt: 'bigint',
      UnsignedTinyInt: 'tinyint unsigned', UnsignedSmallInt: 'smallint unsigned',
      UnsignedMediumInt: 'mediumint unsigned', UnsignedInt: 'int unsigned', UnsignedBigInt: 'bigint unsigned',
      Float: 'float', Double: 'double', Bit: 'bit', Binary: 'binary', VarBinary: 'varbinary',
      TinyBlob: 'tinyblob', Blob: 'blob', MediumBlob: 'mediumblob', LongBlob: 'longblob', Json: 'json',
    }
    const resolved = `${names[name] ?? name.toLowerCase()}${args ? `(${args})` : ''}`
    return resolved.includes(' ') ? `"${resolved}"` : resolved
  }

  return ({
    String: 'varchar(191)', Int: 'int', BigInt: 'bigint', Float: 'double', Decimal: 'decimal(65,30)',
    Boolean: 'boolean', DateTime: 'datetime(3)', Json: 'json', Bytes: 'blob',
  })[type] ?? type
}

function defaultValue(raw, type) {
  if (!raw || raw === 'autoincrement()') return null
  if (raw === 'now()') return '`CURRENT_TIMESTAMP(3)`'
  if (raw === 'uuid()' || raw === 'cuid()') return null
  if (/^-?\d+(?:\.\d+)?$/.test(raw) || /^(true|false|null)$/i.test(raw)) return raw
  if (enumNames.has(type)) return `'${raw}'`
  if (raw.startsWith('dbgenerated(')) return `\`${raw.slice(12, -1).replace(/^"|"$/g, '')}\``
  return `'${raw.replace(/^"|"$/g, '').replaceAll("'", "\\'")}'`
}

const refs = []
const models = blocks('model').map(({ name, body }) => {
  const lines = body.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const tableName = mappedName(lines.find(line => line.startsWith('@@map(')) ?? '', name)
  const fields = []
  const indexes = []

  for (const line of lines) {
    if (line.startsWith('//') || line.startsWith('///')) continue
    if (line.startsWith('@@')) {
      const index = line.match(/^@@(id|unique|index)\(\[([^\]]+)\](?:,\s*map:\s*"([^"]+)")?\)/)
      if (index) {
        indexes.push({
          kind: index[1],
          columns: index[2].split(',').map(value => value.trim().replace(/\(sort:\s*\w+\)/, '')),
          name: index[3],
        })
      }
      continue
    }

    const field = line.match(/^(\w+)\s+([\w]+)(\[\]|\?)?\s*(.*)$/)
    if (!field) continue
    const [, fieldName, type, modifier = '', attributes] = field
    const relation = attributes.match(/@relation\((?:"[^"]+",\s*)?fields:\s*\[([^\]]+)\],\s*references:\s*\[([^\]]+)\](?:,\s*onDelete:\s*(\w+))?/)
    if (relation) {
      const localFields = relation[1].split(',').map(value => value.trim())
      const targetFields = relation[2].split(',').map(value => value.trim())
      refs.push({ model: name, localFields, targetModel: type, targetFields, onDelete: relation[3] })
      continue
    }
    if (modifier === '[]' || blocks('model').some(model => model.name === type)) continue

    const defaultMatch = attributes.match(/@default\(((?:[^()]|\([^()]*\))*)\)/)
    fields.push({
      prismaName: fieldName,
      name: mappedName(attributes, fieldName),
      type: dbType(type, attributes),
      nullable: modifier === '?',
      primary: /(^|\s)@id(\s|$)/.test(attributes),
      unique: /(^|\s)@unique(\s|$)/.test(attributes),
      increment: attributes.includes('@default(autoincrement())'),
      default: defaultValue(defaultMatch?.[1], type),
    })
  }

  return { name, tableName, fields, indexes }
})

const modelByName = new Map(models.map(model => [model.name, model]))
const fieldByPrismaName = (model, name) => model.fields.find(field => field.prismaName === name)?.name ?? name
const quote = value => /[^A-Za-z0-9_]/.test(value) ? `\`${value}\`` : value
const output = [
  '// Generated from prisma/schema.prisma by scripts/prisma-to-dbml.mjs',
  '// Import this file at https://dbdiagram.io',
  '',
  'Project ciwie_cs {',
  "  database_type: 'MySQL'",
  "  Note: 'Application-managed UUID defaults are omitted. Database-only triggers and CHECK constraints remain in Prisma migrations.'",
  '}',
  '',
]

for (const item of enums) {
  output.push(`Enum ${quote(item.name)} {`, ...item.values.map(value => `  ${quote(value)}`), '}', '')
}

for (const model of models) {
  output.push(`Table ${quote(model.tableName)} {`)
  for (const field of model.fields) {
    const settings = []
    if (field.primary) settings.push('pk')
    if (!field.nullable) settings.push('not null')
    if (field.unique) settings.push('unique')
    if (field.increment) settings.push('increment')
    if (field.default !== null) settings.push(`default: ${field.default}`)
    output.push(`  ${quote(field.name)} ${field.type}${settings.length ? ` [${settings.join(', ')}]` : ''}`)
  }
  if (model.indexes.length) {
    output.push('', '  indexes {')
    for (const index of model.indexes) {
      const columns = index.columns.map(column => fieldByPrismaName(model, column)).map(quote).join(', ')
      const settings = []
      if (index.kind === 'id') settings.push('pk')
      if (index.kind === 'unique') settings.push('unique')
      if (index.name) settings.push(`name: '${index.name}'`)
      output.push(`    (${columns})${settings.length ? ` [${settings.join(', ')}]` : ''}`)
    }
    output.push('  }')
  }
  output.push('}', '')
}

for (const ref of refs) {
  const source = modelByName.get(ref.model)
  const target = modelByName.get(ref.targetModel)
  const sourceFields = ref.localFields.map(name => fieldByPrismaName(source, name)).map(quote)
  const targetFields = ref.targetFields.map(name => fieldByPrismaName(target, name)).map(quote)
  const sourceColumn = sourceFields.length === 1 ? sourceFields[0] : `(${sourceFields.join(', ')})`
  const targetColumn = targetFields.length === 1 ? targetFields[0] : `(${targetFields.join(', ')})`
  const settings = ref.onDelete ? ` [delete: ${ref.onDelete.toLowerCase()}]` : ''
  output.push(`Ref: ${quote(source.tableName)}.${sourceColumn} > ${quote(target.tableName)}.${targetColumn}${settings}`)
}

await writeFile(outputPath, `${output.join('\n')}\n`)
console.log(`Generated ${models.length} tables, ${enums.length} enums, and ${refs.length} references.`)
