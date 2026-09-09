import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { MetaService } from './core/services/meta.service';
import { CartService } from './core/services/cart.service';
import { WishlistService } from './core/services/wishlist.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideAppInitializer(async () => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
      const meta = inject(MetaService);
      const auth = inject(AuthService);
      const cart = inject(CartService);
      const wishlist = inject(WishlistService);

      await Promise.all([meta.load(), auth.restore()]);
      if (auth.isAuthenticated()) {
        await Promise.all([cart.load(), wishlist.load()]);
      }
    }),
  ],
};
