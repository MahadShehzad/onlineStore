import { TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination';

describe('PaginationComponent', () => {
  function make(page: number, totalPages: number) {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as { pages(): number[] };
  }

  it('lists every page when there are few', () => {
    expect(make(1, 5).pages()).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses the middle with ellipsis markers', () => {
    const pages = make(6, 12).pages();
    expect(pages[0]).toBe(1);
    expect(pages.at(-1)).toBe(12);
    expect(pages).toContain(-1); // ellipsis
    expect(pages).toContain(6);
  });
});
