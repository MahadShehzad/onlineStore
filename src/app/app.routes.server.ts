import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Auth-gated and dynamic routes are rendered per-request, not prerendered.
  { path: '**', renderMode: RenderMode.Server },
];
