import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthService } from '../services/auth.service';
import * as dotenv from 'dotenv';
dotenv.config();


export const configurePassport = () => {

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await AuthService.findOrCreateGoogleUser(profile);
          return done(null, user);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
};