export function validateSigToken(sigToken, jwt) {
  if (!sigToken) throw new Error("sigToken missing");
  return jwt.verify(sigToken);
}