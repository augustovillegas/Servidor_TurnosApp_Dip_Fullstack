export const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const plain = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete plain.passwordHash;
  delete plain.__v;
  return plain;
};