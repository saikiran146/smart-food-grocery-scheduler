import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('auth.googleClientId') || 'DISABLED',
      clientSecret: configService.get<string>('auth.googleClientSecret') || 'DISABLED',
      callbackURL: configService.get<string>('auth.googleCallbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;
    const avatar = photos?.[0]?.value;

    try {
      const user = await this.authService.findOrCreateGoogleUser({
        googleId: id,
        email,
        name: displayName,
        avatar,
      });
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
