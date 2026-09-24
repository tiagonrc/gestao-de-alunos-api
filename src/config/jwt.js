import 'dotenv/config';
export const JWT_SECRET = process.env.JWT_SECRET || 'segredo-dev-gestao-de-alunos';
export const JWT_EXPIRES_IN = '8h';
