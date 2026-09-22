import bcrypt from 'bcryptjs';

/**
 * Factor de costo de hashing (Salt Rounds).
 * Configurado en 12 según las recomendaciones de la OWASP Password Storage Cheat Sheet.
 * Proporciona un balance óptimo entre resistencia criptográfica (~250-350ms de cómputo)
 * y rendimiento en el servidor.
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashea una contraseña en texto plano utilizando bcrypt y 12 rondas de salting aleatorio.
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plainTextPassword, salt);
}

/**
 * Compara una contraseña en texto plano contra su hash almacenado en tiempo constante.
 */
export async function comparePassword(
  plainTextPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}
