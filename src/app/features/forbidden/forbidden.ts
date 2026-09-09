import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <div class="text-center py-5">
      <i class="bi bi-slash-circle display-1 text-accent"></i>
      <h1 class="h3 fw-bold mt-3">You don't have access to that page</h1>
      <p class="text-muted">Your current role can't open this area of the platform.</p>
      <a class="btn btn-primary mt-2" routerLink="/app">Back to my dashboard</a>
    </div>
  `,
})
export class ForbiddenComponent {}
