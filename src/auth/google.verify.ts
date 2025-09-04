// src/auth/google.verify.ts
import * as dotenv from 'dotenv';
dotenv.config();

import { OAuth2Client, TokenPayload } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export type GoogleUser = {
  id: string;
  email: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export async function verifyGoogleToken(idToken: string): Promise<GoogleUser> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID, // vérifie "aud"
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error('Invalid Google token');

  // Garde-fous utiles
  const issOk =
    payload.iss === 'accounts.google.com' ||
    payload.iss === 'https://accounts.google.com';
  if (!issOk) throw new Error('Invalid issuer');

  if (!payload.email || !payload.email_verified) {
    throw new Error('Email not verified by Google');
  }

  return {
    id: payload.sub,                    // identifiant Google
    email: payload.email,
    given_name: payload.given_name,
    family_name: payload.family_name,
    picture: payload.picture,
  };
}
