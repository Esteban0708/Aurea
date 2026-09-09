// core/services/cart.ts
import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private items = signal<CartItem[]>([]);
  cartItems = this.items.asReadonly();

  total = computed(() =>
    this.items().reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  );

  count = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity, 0)
  );

  add(product: Product) {
    const current = this.items();
    const existing = current.find(i => i.product.id === product.id);

    if (existing) {
      existing.quantity++;
      this.items.set([...current]);
    } else {
      this.items.set([...current, { product, quantity: 1 }]);
    }
  }

  remove(productId: string) {
    this.items.set(this.items().filter(i => i.product.id !== productId));
  }

  updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    const current = this.items();
    const item = current.find(i => i.product.id === productId);
    if (item) {
      item.quantity = quantity;
      this.items.set([...current]);
    }
  }

  clear() {
    this.items.set([]);
  }
}