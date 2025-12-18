// Wrapper para capturar errores async en controllers automáticamente
export const asyncHandler = (fn) => (req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const asyncErrorJson = {
      timestamp: new Date().toISOString(),
      requestId,
      type: "ASYNC_ERROR",
      method: req.method,
      path: req.originalUrl,
      user: req.user ? { id: req.user._id, rol: req.user.rol, email: req.user.email } : null,
      message: err?.message || String(err),
      stack: err?.stack || undefined,
    };

    try {
      console.error("ASYNC_ERROR_JSON:", JSON.stringify(asyncErrorJson));
    } catch (jsonErr) {
      console.error("ASYNC_ERROR_JSON_FALLBACK:", asyncErrorJson);
    }

    next(err);
  });
};
