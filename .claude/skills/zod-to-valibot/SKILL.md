# Zod → Valibot Migration

## Quick start

```typescript
// Before
import { z } from 'zod';
const schema = z.object({ name: z.string(), age: z.number().int().min(0) });
type User = z.infer<typeof schema>;
const result = schema.safeParse(data);

// After
import * as v from 'valibot';
const schema = v.object({ name: v.string(), age: v.pipe(v.number(), v.integer(), v.minValue(0)) });
type User = v.InferOutput<typeof schema>;
const result = v.safeParse(schema, data);
```

## Core rules

1. **Method chains → `pipe()`**: `z.string().email().min(3)` → `v.pipe(v.string(), v.email(), v.minLength(3))`
2. **Parse signature flips**: `schema.parse(data)` → `v.parse(schema, data)`
3. **`safeParse` result key**: `.data` → `.output`, `.error` → `.issues`
4. **Type inference**: `z.infer<T>` → `v.InferOutput<T>`
5. **Object strictness**: Valibot's `object()` strips unknowns by default — use `v.looseObject()` to preserve them
6. **Wrappers, not chains**: `z.string().optional()` → `v.optional(v.string())`

## Common patterns

| Zod | Valibot |
|-----|---------|
| `z.string()` | `v.string()` |
| `z.number()` | `v.number()` |
| `z.boolean()` | `v.boolean()` |
| `z.null()` | `v.null_()` |
| `z.undefined()` | `v.undefined_()` |
| `z.literal('x')` | `v.literal('x')` |
| `z.enum(['a','b'])` | `v.picklist(['a','b'])` |
| `z.nativeEnum(MyEnum)` | `v.enum(MyEnum)` |
| `z.string().optional()` | `v.optional(v.string())` |
| `z.string().nullable()` | `v.nullable(v.string())` |
| `z.string().nullish()` | `v.nullish(v.string())` |
| `z.string().default('x')` | `v.optional(v.string(), 'x')` |
| `z.string().email()` | `v.pipe(v.string(), v.email())` |
| `z.string().min(3)` | `v.pipe(v.string(), v.minLength(3))` |
| `z.number().int()` | `v.pipe(v.number(), v.integer())` |
| `z.number().min(0)` | `v.pipe(v.number(), v.minValue(0))` |
| `z.array(v.string())` | `v.array(v.string())` |
| `z.array(z.string()).min(1)` | `v.pipe(v.array(v.string()), v.minLength(1))` |
| `z.record(z.string(), z.unknown())` | `v.record(v.string(), v.unknown())` |
| `z.union([a, b])` | `v.union([a, b])` |
| `z.intersection(a, b)` | `v.intersect([a, b])` |
| `z.string().transform(fn)` | `v.pipe(v.string(), v.transform(fn))` |
| `z.string().refine(fn, msg)` | `v.pipe(v.string(), v.check(fn, msg))` |
| `z.string().brand<'X'>()` | `v.pipe(v.string(), v.brand('X'))` |
| `z.coerce.number()` | `v.pipe(v.string(), v.transform(Number), v.number())` |
| `schema.pick({a:true})` | `v.pick(schema, ['a'])` |
| `schema.omit({b:true})` | `v.omit(schema, ['b'])` |
| `schema.partial()` | `v.partial(schema)` |
| `schema.extend({d:...})` | `v.object({...schema.entries, d: ...})` |

## Error handling

```typescript
// Before
try { schema.parse(data); }
catch (e) { if (e instanceof z.ZodError) { e.errors; e.flatten(); } }

// After
try { v.parse(schema, data); }
catch (e) { if (v.isValiError(e)) { e.issues; } }

// safeParse
const r = v.safeParse(schema, data);
if (!r.success) r.issues.forEach(i => console.log(i.path?.map(p => p.key).join('.'), i.message));
```

## Object variants

```typescript
v.object(entries)              // strips unknown keys (Zod default)
v.looseObject(entries)         // preserves unknown keys (Zod passthrough)
v.strictObject(entries)        // errors on unknown keys (Zod strict)
v.objectWithRest(entries, v.unknown()) // validates unknown keys against schema
```

## Async validation

```typescript
// Before: schema.parseAsync(data) / schema.safeParseAsync(data)
// After:
const asyncSchema = v.objectAsync({ email: v.pipeAsync(v.string(), v.email(), myAsyncCheck()) });
await v.parseAsync(asyncSchema, data);
await v.safeParseAsync(asyncSchema, data);
```

## See also

- [REFERENCE.md](REFERENCE.md) — full API mapping, discriminated unions, superRefine, getDefaults, async actions, bundle-size tips