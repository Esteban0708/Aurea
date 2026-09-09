import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  readonly cart = inject(CartService);
  customerName = '';
  orderNote = '';
  error = signal('');

  increase(productId: string, quantity: number) {
    this.cart.updateQuantity(productId, quantity + 1);
  }

  decrease(productId: string, quantity: number) {
    this.cart.updateQuantity(productId, quantity - 1);
  }

  sendOrder() {
    const name = this.customerName.trim();
    if (!name) {
      this.error.set('Escribe tu nombre para preparar el pedido.');
      return;
    }

    this.error.set('');
    const lines = this.cart.cartItems().map(item =>
      `- ${item.quantity} x ${item.product.name} ($${item.product.price * item.quantity})`
    );
    const message = [
      'Hola Aurea, quiero hacer este pedido:',
      '',
      ...lines,
      '',
      `Total: $${this.cart.total()}`,
      `Nombre: ${name}`,
      this.orderNote.trim() ? `Nota: ${this.orderNote.trim()}` : ''
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/573209331734?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }
}
