import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../../core/models/catalog.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { SpinnerComponent } from '../../../shared/ui/spinner';

const ICONS = ['bi-tag', 'bi-cpu', 'bi-bag-heart', 'bi-house-heart', 'bi-flower1', 'bi-bicycle', 'bi-book', 'bi-controller', 'bi-gem', 'bi-cup-hot'];

@Component({
  selector: 'app-category-management',
  imports: [ReactiveFormsModule, SpinnerComponent],
  templateUrl: './category-management.html',
})
export class CategoryManagementComponent {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = ICONS;
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    icon: ['bi-tag', Validators.required],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.catalog.categories().subscribe((c) => {
      this.categories.set(c);
      this.loading.set(false);
    });
  }

  protected edit(c: Category): void {
    this.editingId.set(c.id);
    this.form.setValue({ name: c.name, icon: c.icon });
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.form.reset({ icon: 'bi-tag' });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.form.getRawValue();
    const id = this.editingId();
    const req = id
      ? this.http.put<Category>(`/api/categories/${id}`, body)
      : this.http.post<Category>('/api/categories', body);
    req.subscribe(() => {
      this.notify.success(id ? 'Category updated' : 'Category added');
      this.cancel();
      this.load();
    });
  }

  protected async remove(c: Category): Promise<void> {
    if (c.productCount > 0) {
      this.notify.error('Move or delete this category\'s products first.');
      return;
    }
    if (await this.confirm.ask(`Delete "${c.name}"?`, { danger: true, confirmText: 'Delete' })) {
      this.http.delete(`/api/categories/${c.id}`).subscribe(() => {
        this.notify.success('Category deleted');
        this.load();
      });
    }
  }
}
