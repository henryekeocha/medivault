import { jwtVerify } from 'jose';
import { clerkConfig } from './config';

const PUBLIC_KEY = `MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA15NEp0fHipCIvyhjDsGv
cjcfuoplgHyUiEkChXGHjmlg34bms9siMQbhn2nHUgCgcAEgORnDW3NxGcUF8xii
nrM3HsejBFfQ5olYchxpInGUFlf+ZqiwbhHot9wXjKTGZ8+rD6XJKdQedSGq6bM2
s7bdOn2+vBjUuVyf91NGmraLochCuEc6ZlOExc6/Z0pwgSKRJkNfXDpid0MjMP/Y
4ao1XCl7LmMP7lOML7ZaTRcvZAx2MuG+qbgkcuGpFLqF4YXFJydRt3I2phrboioj
v6NLSZXS4UHVQ3oEiLjr9V/GmDInluvQj2t6nZMhT8+OOKK+kq2slRr6v3YxHhbU
gwIDAQAB`;

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(PUBLIC_KEY), {
      issuer: clerkConfig.frontendApi,
      audience: clerkConfig.frontendApi,
    });
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function getTokenFromHeader(authHeader: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
} 