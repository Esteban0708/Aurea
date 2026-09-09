import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-catalog',
  imports: [CommonModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss'
})
export class Catalog implements OnInit {
  private productService = inject(ProductService);
  cart = inject(CartService);

  products = signal<Product[]>([]);
  loading = signal(true);
  activeCategory = signal('Todos');

  categories = computed(() => [
    'Todos',
    ...new Set(this.products().map(product => product.category).filter(Boolean))
  ]);

  filteredProducts = computed(() => {
    const category = this.activeCategory();
    return category === 'Todos'
      ? this.products()
      : this.products().filter(product => product.category === category);
  });

  async ngOnInit() {
    try {
      const data = await this.productService.getProducts();
      this.products.set(data);
    } catch (error) {
      console.error('No se pudieron cargar los productos', error);
    } finally {
      this.loading.set(false);
    }
  }

  addToCart(product: Product) {
    this.cart.add(product);
  }

  selectCategory(category: string) {
    this.activeCategory.set(category);
  }
}