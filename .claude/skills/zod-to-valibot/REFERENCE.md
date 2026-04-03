# Zod → Valibot: Full Reference

## Philosophy shift

Zod uses **method chaining** on a schema object. Valibot uses **functional composition** with `pipe()`. This is the single biggest conceptual change — every `.method()` call becomes an argument inside `v.pipe(schema, action1, action2, ...)`.

This makes Valibot extremely tree-shakeable (~700 bytes core vs ~8-15 KB for Zod).

---

## Imports

```typescript
// Zod — single named export
import { z } from 'zod';

// Valibot — namespace import (recommended for readability during migration)
import * as v from 'valibot';

// Valibot — named imports (better tree-shaking in apps)
import { object, string, email, pipe, parse, safeParse } from 'valibot';
```

---

## TypeScript type inference

```typescript
// Zod
type Input  = z.input<typeof schema>;
type Output = z.output<typeof schema>;   // same as z.infer<>
type Infer  = z.infer<typeof schema>;

// Valibot
type Input  = v.InferInput<typeof schema>;
type Output = v.InferOutput<typeof schema>;  // equivalent to z.infer<>
type Issue  = v.InferIssue<typeof schema>;   // no Zod equivalent

// Input and Output differ when pipe() contains transform()
const schema = v.pipe(
  v.object({ name: v.string() }),
  v.transform(input => ({ ...input, id: crypto.randomUUID() }))
);
type In  = v.InferInput<typeof schema>;   // { name: string }
type Out = v.InferOutput<typeof schema>;  // { name: string, id: string }
```

---

## Primitives with reserved names

Some Valibot primitives conflict with JS keywords and get a trailing `_`:

| Zod | Valibot |
|-----|---------|
| `z.null()` | `v.null_()` |
| `z.undefined()` | `v.undefined_()` |
| `z.void()` | `v.void_()` |
| `z.never()` | `v.never()` *(no underscore)* |

---

## Objects in depth

```typescript
// Zod default (strips unknowns)
z.object({ id: z.string() })

// Zod passthrough (preserves unknowns)
z.object({ id: z.string() }).passthrough()

// Zod strict (errors on unknowns)
z.object({ id: z.string() }).strict()

// Valibot equivalents:
v.object({ id: v.string() })                        // strips (Zod default)
v.looseObject({ id: v.string() })                   // preserves (Zod passthrough)
v.strictObject({ id: v.string() })                  // errors (Zod strict)
v.objectWithRest({ id: v.string() }, v.string())    // validates rest against schema

// Extending objects
const base = v.object({ id: v.string() });
const extended = v.object({ ...base.entries, name: v.string() });

// Pick / omit
v.pick(schema, ['id', 'name']);
v.omit(schema, ['internalField']);

// Partial / required
v.partial(schema);                        // all optional
v.partial(schema, ['name']);              // only 'name' optional
v.required(schema);                       // all required
v.required(schema, ['name']);             // only 'name' required
```

---

## Enums

```typescript
// Zod string enum
z.enum(['admin', 'user'])

// Valibot picklist (for string/number literals — no TypeScript enum)
v.picklist(['admin', 'user'])
// InferOutput = 'admin' | 'user'

// Zod native enum
enum Role { Admin = 'admin', User = 'user' }
z.nativeEnum(Role)

// Valibot enum (for TypeScript enums)
v.enum(Role)
```

---

## Unions and discriminated unions

```typescript
// Zod union
z.union([z.string(), z.number()])

// Valibot union
v.union([v.string(), v.number()])

// Zod discriminated union
z.discriminatedUnion('type', [
  z.object({ type: z.literal('cat'), meows: z.boolean() }),
  z.object({ type: z.literal('dog'), barks: z.boolean() }),
])

// Valibot — use regular union (Valibot's union already tries each branch)
v.union([
  v.object({ type: v.literal('cat'), meows: v.boolean() }),
  v.object({ type: v.literal('dog'), barks: v.boolean() }),
])

// Intersection
z.intersection(schemaA, schemaB)
v.intersect([schemaA, schemaB])
```

---

## Optional, nullable, nullish, defaults

```typescript
// Zod
z.string().optional()            // string | undefined
z.string().nullable()            // string | null
z.string().nullish()             // string | null | undefined
z.string().default('fallback')   // returns 'fallback' when input is undefined

// Valibot — wrappers, not chains
v.optional(v.string())                    // string | undefined
v.optional(v.string(), 'fallback')        // with static default
v.optional(v.date(), () => new Date())    // with factory default

v.nullable(v.string())                    // string | null
v.nullable(v.string(), null)              // explicit null default

v.nullish(v.string())                     // string | null | undefined
v.nullish(v.string(), 'fallback')

// Fallback (replaces value on ANY parse failure, not just undefined)
v.fallback(v.string(), 'fallback')        // different semantics — use carefully

// Get all defaults from a schema
v.getDefaults(schema)  // { field: defaultValue, ... }
```

---

## Transforms and refinements

```typescript
// --- Transforms ---

// Zod
z.string().transform(s => s.toUpperCase())

// Valibot
v.pipe(v.string(), v.transform(s => s.toUpperCase()))

// Built-in transform actions
v.pipe(v.string(), v.trim())
v.pipe(v.string(), v.toLowerCase())
v.pipe(v.string(), v.toUpperCase())
v.pipe(v.string(), v.toMinValue(0))   // clamp to minimum
v.pipe(v.string(), v.toMaxValue(100)) // clamp to maximum

// --- Refinements ---

// Zod .refine()
z.string().refine(val => val.startsWith('x'), { message: 'Must start with x' })

// Valibot v.check()
v.pipe(v.string(), v.check(val => val.startsWith('x'), 'Must start with x'))

// Zod .superRefine() — access issue context directly
z.string().superRefine((val, ctx) => {
  if (val.length < 3) ctx.addIssue({ code: 'custom', message: 'Too short' });
  if (val.length > 10) ctx.addIssue({ code: 'custom', message: 'Too long' });
})

// Valibot v.rawCheck() — access dataset and addIssue
v.pipe(
  v.string(),
  v.rawCheck(({ dataset, addIssue }) => {
    if (dataset.value.length < 3) addIssue({ message: 'Too short' });
    if (dataset.value.length > 10) addIssue({ message: 'Too long' });
  })
)

// Valibot v.rawTransform() — transform with issue access
v.pipe(
  v.string(),
  v.rawTransform(({ dataset, addIssue, NEVER }) => {
    if (!dataset.value.startsWith('x')) {
      addIssue({ message: 'Must start with x' });
      return NEVER; // signal failure
    }
    return dataset.value.slice(1);
  })
)
```

---

## Built-in string validators

```typescript
// These all go inside pipe()
v.email()             // z.string().email()
v.url()               // z.string().url()
v.uuid()              // z.string().uuid()
v.cuid2()             // z.string().cuid2()
v.ulid()              // z.string().ulid()
v.emoji()             // z.string().emoji()
v.ip()                // z.string().ip()
v.ipv4()
v.ipv6()
v.isoDate()           // z.string().date()
v.isoDateTime()       // z.string().datetime()
v.isoTime()           // z.string().time()
v.isoTimestamp()
v.base64()
v.hexColor()
v.minLength(n)        // z.string().min(n)
v.maxLength(n)        // z.string().max(n)
v.length(n)           // z.string().length(n)
v.nonEmpty()          // z.string().min(1)
v.startsWith('x')     // z.string().startsWith('x')
v.endsWith('x')       // z.string().endsWith('x')
v.includes('x')       // z.string().includes('x')
v.regex(/pattern/)    // z.string().regex()
v.trim()              // z.string().trim()
v.toLowerCase()       // z.string().toLowerCase()
v.toUpperCase()       // z.string().toUpperCase()
```

---

## Built-in number validators

```typescript
v.integer()           // z.number().int()
v.minValue(n)         // z.number().min(n) / z.number().gte(n)
v.maxValue(n)         // z.number().max(n) / z.number().lte(n)
v.value(n)            // exact value
v.finite()            // z.number().finite()
v.safeInteger()       // z.number().safe()
v.multipleOf(n)       // z.number().multipleOf(n)
```

---

## Coercion (no direct equivalent)

Valibot has no `z.coerce.*` — use `transform()`:

```typescript
// z.coerce.number()
v.pipe(v.unknown(), v.transform(Number), v.number())

// z.coerce.string()
v.pipe(v.unknown(), v.transform(String), v.string())

// z.coerce.date()
v.pipe(v.unknown(), v.transform(val => new Date(val as string)), v.date())

// z.coerce.boolean()
v.pipe(v.unknown(), v.transform(Boolean), v.boolean())
```

---

## Branded types

```typescript
// Zod
const UserId = z.string().uuid().brand<'UserId'>();
type UserId = z.infer<typeof UserId>;

// Valibot
const UserId = v.pipe(v.string(), v.uuid(), v.brand('UserId'));
type UserId = v.InferOutput<typeof UserId>;
```

---

## Parse API

```typescript
// Zod                             // Valibot
schema.parse(data)                 v.parse(schema, data)
schema.parseAsync(data)            v.parseAsync(schema, data)
schema.safeParse(data)             v.safeParse(schema, data)
schema.safeParseAsync(data)        v.safeParseAsync(schema, data)

// Result shape
// Zod:    { success: true, data } | { success: false, error: ZodError }
// Valibot:{ success: true, output } | { success: false, issues: ValiError['issues'] }

// Type guard
schema.safeParse(data).success
v.is(schema, data)   // boolean guard (no issues available)

// Parse options
v.safeParse(schema, data, { abortEarly: true })      // stop at first schema error
v.safeParse(schema, data, { abortPipeEarly: true })  // stop at first pipe action error
```

---

## Error handling

```typescript
// Zod
try {
  schema.parse(data);
} catch (e) {
  if (e instanceof z.ZodError) {
    e.errors;           // ZodIssue[]
    e.flatten();        // { formErrors: string[], fieldErrors: { [key]: string[] } }
    e.format();         // nested error object
  }
}

// Valibot
try {
  v.parse(schema, data);
} catch (e) {
  if (v.isValiError(e)) {
    e.issues;           // BaseIssue[]
    // Each issue: { message, path, input, expected, received, ... }
    // path is an array: [{ type: 'object', key: 'email', value: ... }]
  }
}

// Flatten issues manually
function flattenIssues(issues: v.BaseIssue<unknown>[]) {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  for (const issue of issues) {
    const path = issue.path?.map(p => (p as { key: string }).key).join('.');
    if (path) {
      (fieldErrors[path] ??= []).push(issue.message);
    } else {
      formErrors.push(issue.message);
    }
  }
  return { fieldErrors, formErrors };
}
```

---

## Async schemas

Async validation requires async schema variants — you cannot mix async actions into sync schemas:

```typescript
import { objectAsync, pipeAsync, string, parseAsync, checkAsync } from 'valibot';

const schema = v.objectAsync({
  username: v.pipeAsync(
    v.string(),
    v.minLength(3),
    v.checkAsync(async (val) => {
      return !(await db.userExists(val));
    }, 'Username already taken')
  ),
});

const result = await v.safeParseAsync(schema, data);
```

---

## Zod features with no direct Valibot equivalent

| Zod feature | Closest Valibot approach |
|-------------|--------------------------|
| `z.catch(fallback)` | `v.fallback(schema, fallback)` — runs fallback on *any* failure, not just throws |
| `z.preprocess(fn, schema)` | `v.pipe(v.unknown(), v.transform(fn), schema)` |
| `z.lazy(() => schema)` | `v.lazy(() => schema)` — same name, same purpose |
| `schema.describe('...')` | No equivalent yet (planned) |
| `schema.readonly()` | No runtime equivalent; use `as const` or `Readonly<T>` |
| `z.promise(schema)` | No equivalent; validate resolved value instead |
| `z.function()` | No equivalent |

---

## Full worked example

```typescript
// ── BEFORE (Zod) ────────────────────────────────────────────────

import { z } from 'zod';

const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string(),
  zip: z.string().regex(/^\d{5}$/, 'Must be 5-digit ZIP'),
});

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).refine(
    p => /[A-Z]/.test(p),
    { message: 'Must contain uppercase letter' }
  ),
  age: z.number().int().min(18).max(120).optional(),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
  tags: z.array(z.string()).min(1).max(10),
  address: AddressSchema.optional(),
  createdAt: z.date().default(() => new Date()),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

type User = z.infer<typeof UserSchema>;

const result = UserSchema.safeParse(rawData);
if (!result.success) {
  console.log(result.error.flatten());
} else {
  const user: User = result.data;
}


// ── AFTER (Valibot) ──────────────────────────────────────────────

import * as v from 'valibot';

const AddressSchema = v.object({
  street: v.pipe(v.string(), v.minLength(1)),
  city: v.string(),
  zip: v.pipe(v.string(), v.regex(/^\d{5}$/, 'Must be 5-digit ZIP')),
});

const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  email: v.pipe(v.string(), v.email(), v.transform(e => e.toLowerCase())),
  password: v.pipe(
    v.string(),
    v.minLength(8),
    v.check(p => /[A-Z]/.test(p), 'Must contain uppercase letter')
  ),
  age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(18), v.maxValue(120))),
  role: v.optional(v.picklist(['admin', 'user', 'guest']), 'user'),
  tags: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(10)),
  address: v.optional(AddressSchema),
  createdAt: v.optional(v.date(), () => new Date()),
  metadata: v.optional(v.record(v.string(), v.unknown())),
});

type User = v.InferOutput<typeof UserSchema>;

const result = v.safeParse(UserSchema, rawData);
if (!result.success) {
  result.issues.forEach(i => {
    const path = i.path?.map(p => (p as { key: string }).key).join('.');
    console.log(`${path ?? '(root)'}: ${i.message}`);
  });
} else {
  const user: User = result.output;
}
```