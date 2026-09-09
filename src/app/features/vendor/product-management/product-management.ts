import { Component, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { Category, PagedResult, ProductInput, ProductSummary } from '../../../core/models/catalog.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';
import { FallbackImgDirective } from '../../../shared/directives/fallback-img.directive';

@Component({
  selector: 'app-product-management',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MoneyPipe,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
    FallbackImgDirective,
  ],
  templateUrl: './product-management.html',
})
export class ProductManagementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly categories = signal<Category[]>([]);
  protected readonly result = signal<PagedResult<ProductSummary> | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected search = '';

  protected readonly modalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly images = new FormArray<FormControl<string>>([]);
  protected readonly variants = new FormArray<
    FormGroup<{
      name: FormControl<string>;
      value: FormControl<string>;
      priceDelta: FormControl<number>;
      stock: FormControl<number>;
    }>
  >([]);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    categoryId: ['', Validators.required],
    brand: [''],
    isActive: [true],
    images: this.images,
    variants: this.variants,
  });
  protected readonly title = computed(() => (this.editingId() ? 'Edit product' : 'New product'));

  constructor() {
    this.catalog.categories().subscribe((c) => this.categories.set(c));
    this.load();
  }

  private variantGroup(v?: { name: string; value: string; priceDelta: number; stock: number }) {
    return this.fb.nonNullable.group({
      name: [v?.name ?? '', Validators.required],
      value: [v?.value ?? '', Validators.required],
      priceDelta: [v?.priceDelta ?? 0],
      stock: [v?.stock ?? 0, Validators.min(0)],
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.catalog.mine(this.page(), 8, this.search.trim() || undefined).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected setPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  protected runSearch(): void {
    this.page.set(1);
    this.load();
  }

  protected addImage(url = ''): void {
    this.images.push(this.fb.nonNullable.control(url, Validators.required));
  }

  protected addVariant(): void {
    this.variants.push(this.variantGroup());
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.reset({ price: 0, stock: 0, isActive: true, brand: '', categoryId: this.categories()[0]?.id ?? '' });
    this.images.clear();
    this.variants.clear();
    this.addImage();
    this.modalOpen.set(true);
  }

  protected async openEdit(p: ProductSummary): Promise<void> {
    const detail = await new Promise<import('../../../core/models/catalog.model').ProductDetail>((res, rej) =>
      this.catalog.detail(p.id).subscribe({ next: res, error: rej }),
    );
    this.editingId.set(p.id);
    this.form.reset({
      name: detail.name,
      description: detail.description,
      price: detail.price,
      stock: detail.stock,
      categoryId: detail.categoryId,
      brand: detail.brand,
      isActive: detail.isActive,
    });
    this.images.clear();
    detail.images.forEach((i) => this.addImage(i));
    if (this.images.length === 0) this.addImage();
    this.variants.clear();
    detail.variants.forEach((v) => this.variants.push(this.variantGroup(v)));
    this.modalOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Fix the highlighted fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const input: ProductInput = {
      name: raw.name,
      description: raw.description,
      price: Number(raw.price),
      stock: Number(raw.stock),
      categoryId: raw.categoryId,
      brand: raw.brand,
      isActive: raw.isActive,
      images: (raw.images as string[]).filter((i) => i.trim()),
      variants: (raw.variants as ProductInput['variants']).filter((v) => v.name && v.value),
    };
    this.saving.set(true);
    const id = this.editingId();
    const req = id ? this.catalog.update(id, input) : this.catalog.create(input);
    req.subscribe({
      next: () => {
        this.notify.success(id ? 'Product updated' : 'Product created');
        this.modalOpen.set(false);
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected async remove(p: ProductSummary): Promise<void> {
    if (await this.confirm.ask(`Delete "${p.name}"?`, { danger: true, confirmText: 'Delete' })) {
      this.catalog.remove(p.id).subscribe(() => {
        this.notify.success('Product removed');
        this.load();
      });
    }
  }
}
