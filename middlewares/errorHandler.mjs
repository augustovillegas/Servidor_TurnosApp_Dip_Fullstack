export const errorHandler = (err, _req, res, _next) => {
  console.error("Error:", err.message);
  if (process.env.NODE_ENV !== "production" && err.stack) {
    console.error(err.stack);
  }

  const status = err.status || 500;
  const message = err.message || "Error interno del servidor";
  const payload = { message };

  if (err.errores) {
    payload.errores = err.errores;
  }

  res.status(status).json(payload);
};
