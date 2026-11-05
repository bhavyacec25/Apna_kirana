// middleware/errorHandler.js
// Centralized error handling: routes can just `throw` or call
// `next(err)` and this catches it, so we don't repeat try/catch
// boilerplate with slightly different error shapes in every route.

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  // zod validation errors
  if (err.name === "ZodError") {
    const message = err.errors?.[0]?.message || "Invalid input.";
    return res.status(400).json({ error: message, details: err.errors });
  }

  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong on our end. Please try again." : err.message;
  res.status(status).json({ error: message });
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 doesn't automatically forward errors thrown/rejected inside
// an async route handler to next(err) — wrap every async handler with
// this so ApiError/ZodError/etc. still reach errorHandler above instead
// of becoming an unhandled rejection.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
