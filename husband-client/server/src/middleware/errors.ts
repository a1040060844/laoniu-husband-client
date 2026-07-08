import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status =
    typeof error.statusCode === "number"
      ? error.statusCode
      : typeof error.status === "number"
        ? error.status
        : 500;
  response.status(status).json({
    error: error instanceof Error ? error.message : "Internal server error",
  });
};
