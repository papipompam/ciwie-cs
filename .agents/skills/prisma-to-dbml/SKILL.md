---
name: prisma-to-dbml
description: Convert Prisma schema files into clean, parser-safe dbdiagram.io DBML, preserving tables, mapped columns, keys, nullability, enums, and foreign-key relationships.
---

# Prisma to dbdiagram DBML

Use this skill when the user asks to convert a Prisma schema into dbdiagram.io syntax or to repair DBML generated from Prisma.

## Required outcome

Produce a pure DBML file (usually `.md` or `.dbml`) that can be pasted directly into dbdiagram.io. Keep the database structure complete, but prioritize valid DBML over a character-for-character Prisma translation.

## Conversion rules

- Read the entire `schema.prisma` before generating output.
- Convert every `model` to `Table`; use `@@map` for the table name and `@map` for column names.
- Convert scalar types to conservative DBML types: String→varchar, Int→int, BigInt→bigint, Float→double, Decimal→decimal, Boolean→boolean, DateTime→datetime, Json→json, Bytes→binary.
- Preserve primary keys and nullability. Required fields must have `[not null]`; optional Prisma fields must have `[null]`.
- Convert enum-typed fields to `varchar` for maximum dbdiagram compatibility. Preserve enum definitions as comments or separate documentation unless verified DBML enum typing is supported.
- Do not emit Prisma defaults, `@updatedAt`, `@relation` attributes, or unsupported provider-specific annotations.
- Convert every relation with a scalar `fields` list into a `Ref` using mapped database column names on both sides.
- Never use Prisma property names in `Ref` or index definitions when `@map` changes the physical column name.
- Omit indexes if their syntax cannot be validated.
- Do not add `Records` blocks unless real sample rows were provided.
- Do not invent `Dep` lineage. Prisma foreign keys are relationships, not derived data lineage.

## Validation checklist

1. Confirm the output contains the same number of tables as Prisma models.
2. Confirm every relation has a corresponding `Ref` and both referenced columns exist in their tables.
3. Confirm no output contains `default:`, `@`, Prisma field names where an `@map` exists, Markdown headings, or code fences.
4. Confirm no placeholder text such as `\\1`, `\\2`, `NaN`, or malformed brackets remains.
5. Confirm optional foreign keys are handled consistently; do not silently claim a nullable column is required.

## Deliverable

Save the result in the requested project location and report the exact absolute path, table count, relation count, and intentional simplifications.
