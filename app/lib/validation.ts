import { data } from "react-router";
import * as v from "valibot";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = {
  success: false;
  errors: Record<string, string>;
};
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/**
 * Converts FormData to a plain object, validates with a Valibot schema,
 * and returns either the parsed data or a field-error map (first error per field).
 */
export function parseFormData<T extends ValibotSchema>(
  formData: FormData,
  schema: T
): ParseResult<v.InferOutput<T>> {
  const raw = Object.fromEntries(formData);
  const result = v.safeParse(schema, raw);

  if (result.success) {
    return { success: true, data: result.output };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.issues) {
    const key = issue.path?.[0]?.key as string | undefined;
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Validates route params with a Valibot schema.
 * Throws a 400 response on failure (params are never user-correctable form errors).
 */
export function parseParams<T extends ValibotSchema>(
  params: Record<string, string | undefined>,
  schema: T
): v.InferOutput<T> {
  const result = v.safeParse(schema, params);

  if (result.success) {
    return result.output;
  }

  throw data("Invalid parameters", { status: 400 });
}

/**
 * Parses a JSON request body with a Valibot schema.
 * Returns either the parsed data or a field-error map (first error per field).
 */
export async function parseJsonBody<T extends ValibotSchema>(
  request: Request,
  schema: T
): Promise<ParseResult<v.InferOutput<T>>> {
  const raw = await request.json();
  const result = v.safeParse(schema, raw);

  if (result.success) {
    return { success: true, data: result.output };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.issues) {
    const key = issue.path?.[0]?.key as string | undefined;
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }

  return { success: false, errors };
}
