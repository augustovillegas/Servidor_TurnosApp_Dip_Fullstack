export const errorHandler = (err, _req, res, _next) => {
  console.error("Error:", err.message);
  if (err?.status === 422 && Array.isArray(err.errores) && err.errores.length) {
    const detalles = err.errores
      .map((e) => `${e.campo}: ${e.mensaje}`)
      .join(" | ");
    console.error("Detalle de validacion:", detalles);
  }
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
