import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { navFor } from './nav';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly cart = inject(CartService);
  protected readonly wishlist = inject(WishlistService);

  protected readonly user = this.auth.user;
  protected readonly sections = computed(() => navFor(this.auth.role()));
  protected readonly isCustomer = computed(() => this.auth.role() === 'Customer');
  protected readonly sidebarOpen = signal(false);

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.cart.reset();
    this.wishlist.reset();
    await this.router.navigate(['/login']);
  }
}
