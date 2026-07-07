// src/lib/apiError.ts

// The real backend returns errors in three different shapes, and none of
// them are { message: "..." }:
// 1. return BadRequest("some string") -> the whole response body IS that string
// 2. Automatic [Required]/[EmailAddress]/etc. validation failures -> ValidationProblemDetails:
//    { title: "...", errors: { "Slug": ["reason"], "Email": ["reason"] } }
// 3. Unhandled exceptions -> plain text or empty
export function getErrorMessage(data: unknown, fallback = "Something went wrong."): string {
  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.errors && typeof obj.errors === "object") {
      const messages = Object.values(obj.errors as Record<string, unknown>)
        .flat()
        .filter((m): m is string => typeof m === "string" && m.length > 0);
      if (messages.length > 0) return messages.join(" ");
    }
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.title === "string" && obj.title) return obj.title;
  }
  return fallback;
}

export async function extractErrorMessage(res: Response, fallback = "Something went wrong."): Promise<string> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return fallback;
  }
  return getErrorMessage(data, fallback);
}
