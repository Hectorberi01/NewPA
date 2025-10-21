import passport, { use } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { OIDCStrategy as AzureStrategy } from 'passport-azure-ad';
import dotenv from 'dotenv';
import { AuthService } from '../services/auth.service';

dotenv.config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: 'http://localhost:4000/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {

    const user =  await AuthService.findOrCreateGoogleUser(profile);
  done(null, user);
}));

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((obj: any, done) => done(null, obj));

export default passport;
