import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The signed-in app depends on localStorage (JWT) which doesn't exist on the
 * server, so everything behind /app — and the auth screens — renders on the
 * client. The public storefront is server-rendered for SEO / first paint.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'app', renderMode: RenderMode.Client },
  { path: 'app/**', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'signup', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
