import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { homeRouteFor } from '../../core/models/user.model';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.user;
  protected readonly appHome = computed(() => {
    const u = this.user();
    return u ? homeRouteFor(u) : '/login';
  });

  protected readonly categories = [
    { name: 'Electronics', icon: 'bi-cpu' },
    { name: 'Fashion', icon: 'bi-bag-heart' },
    { name: 'Home & Living', icon: 'bi-house-heart' },
    { name: 'Beauty', icon: 'bi-flower1' },
    { name: 'Sports', icon: 'bi-bicycle' },
    { name: 'Books', icon: 'bi-book' },
  ];

  protected readonly perks = [
    { icon: 'bi-shop-window', title: 'Many stores, one cart', text: 'Shop products from independent vendors in a single checkout.' },
    { icon: 'bi-shield-check', title: 'Buyer protection', text: 'Track every order from pending to delivered, backed by dispute support.' },
    { icon: 'bi-truck', title: 'Fast fulfilment', text: 'Vendors manage their own stock so listings stay accurate.' },
  ];
}
