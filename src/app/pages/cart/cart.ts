import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  readonly cart = inject(CartService);
  private orderService = inject(OrderService);
  customerName = '';
  orderNote = '';
  error = signal('');
  sending = signal(false);

  increase(productId: string, quantity: number) {
    this.cart.updateQuantity(productId, quantity + 1);
  }

  decrease(productId: string, quantity: number) {
    this.cart.updateQuantity(productId, quantity - 1);
  }

  async sendOrder() {
    const name = this.customerName.trim();
    if (!name) {
      this.error.set('Escribe tu nombre para preparar el pedido.');
      return;
    }

    this.error.set('');
    this.sending.set(true);
    try {
      const items = this.cart.cartItems();
      const orderId = await this.orderService.createOrder(
        { customer_name: name, customer_note: this.orderNote.trim(), total: this.cart.total() },
        items.map(item => ({
          product_id: item.product.id!,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price
        }))
      );
      const lines = items.map(item =>
        `- ${item.quantity} x ${item.product.name} ($${item.product.price * item.quantity})`
      );
      const message = [
        'Hola Aurea, quiero hacer este pedido:',
        '',
        ...lines,
        '',
        `Total: $${this.cart.total()}`,
        `Nombre: ${name}`,
        `Referencia: ${orderId.slice(0, 8).toUpperCase()}`,
        this.orderNote.trim() ? `Nota: ${this.orderNote.trim()}` : ''
      ].filter(Boolean).join('\n');

      window.open(`https://wa.me/573209331734?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    } catch (error) {
      this.error.set('No se pudo registrar el pedido. Intenta nuevamente.');
      console.error(error);
    } finally {
      this.sending.set(false);
    }
  }
}
