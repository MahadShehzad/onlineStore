export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  productCount: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  priceDelta: number;
  stock: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  brand: string;
  categoryId: string;
  categoryName: string;
  vendorId: string;
  storeName: string;
  rating: number;
  ratingCount: number;
  stock: number;
  isActive: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  storeLogo: string;
  variants: ProductVariant[];
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductFilters {
  brands: string[];
  minPrice: number;
  maxPrice: number;
}

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categorySlug?: string;
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'name';
  vendorId?: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  brand: string;
  images: string[];
  isActive: boolean;
  variants: { name: string; value: string; priceDelta: number; stock: number }[];
}
