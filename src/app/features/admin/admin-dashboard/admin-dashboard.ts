import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <h1 class="h3 fw-bold mb-1">Admin console</h1>
    <p class="text-muted">Platform control. Individual tools land in Phase 5.</p>

    <div class="row g-3 mt-1">
      @for (card of roadmap; track card.title) {
        <div class="col-sm-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body">
              <i class="bi {{ card.icon }} fs-3 text-brand"></i>
              <h2 class="h6 fw-bold mt-2">{{ card.title }}</h2>
              <p class="text-muted small mb-2">{{ card.text }}</p>
              <span class="badge text-bg-secondary">{{ card.phase }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardComponent {
  protected readonly roadmap = [
    { icon: 'bi-patch-check', title: 'Vendor approval', text: 'Approve or reject vendor registrations.', phase: 'Phase 5' },
    { icon: 'bi-tags', title: 'Category management', text: 'Maintain the category tree.', phase: 'Phase 5' },
    { icon: 'bi-percent', title: 'Commission settings', text: 'Set platform fees per vendor or globally.', phase: 'Phase 5' },
    { icon: 'bi-people', title: 'User management', text: 'Block or unblock accounts.', phase: 'Phase 5' },
    { icon: 'bi-bar-chart', title: 'Platform analytics', text: 'Marketplace-wide sales and growth.', phase: 'Phase 5' },
    { icon: 'bi-chat-left-dots', title: 'Dispute handling', text: 'Resolve customer complaints.', phase: 'Phase 5' },
  ];
}
