import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  template: `
    <div class="container-fluid px-0" style="max-width: 640px">
      <h1 class="h3 fw-bold mb-1">My profile</h1>
      <p class="text-muted">Account details for this session.</p>

      @if (user(); as u) {
        <div class="card">
          <div class="card-body">
            <dl class="row mb-0">
              <dt class="col-sm-4 text-muted">Name</dt>
              <dd class="col-sm-8">{{ u.name }}</dd>
              <dt class="col-sm-4 text-muted">Email</dt>
              <dd class="col-sm-8">{{ u.email }}</dd>
              <dt class="col-sm-4 text-muted">Role</dt>
              <dd class="col-sm-8"><span class="badge text-bg-secondary">{{ u.role }}</span></dd>
              @if (u.role === 'Vendor') {
                <dt class="col-sm-4 text-muted">Store status</dt>
                <dd class="col-sm-8">
                  <span
                    class="badge"
                    [class.text-bg-success]="u.vendorStatus === 'Approved'"
                    [class.text-bg-warning]="u.vendorStatus === 'Pending'"
                    [class.text-bg-danger]="u.vendorStatus === 'Rejected'"
                  >{{ u.vendorStatus }}</span>
                </dd>
              }
            </dl>
          </div>
        </div>
        <p class="text-muted small mt-3">
          Editing profile details lands in a later phase.
        </p>
      }
    </div>
  `,
})
export class ProfileComponent {
  protected readonly user = inject(AuthService).user;
}
