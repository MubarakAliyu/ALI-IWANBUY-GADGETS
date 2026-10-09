/**
 * The one error type the API throws on purpose. Everything else that escapes a handler is a bug and becomes a
 * 500 with no detail in the response (overview §12 — no stack traces on the wire).
 */

export type FieldError = { path: string; message: string };

export class AppError extends Error {
  override name = "AppError";
  readonly status: number;
  readonly code: string;
  readonly fields: FieldError[] | undefined;

  constructor(status: number, code: string, message: string, fields?: FieldError[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message: string, fields?: FieldError[]): AppError {
    return new AppError(400, "BAD_REQUEST", message, fields);
  }

  static notFound(message = "Not found"): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, "CONFLICT", message);
  }

  static unprocessable(message: string, fields?: FieldError[]): AppError {
    return new AppError(422, "UNPROCESSABLE", message, fields);
  }
}
