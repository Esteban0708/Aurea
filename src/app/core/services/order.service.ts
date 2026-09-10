import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Order, OrderItem, OrderStatus } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private supabase = inject(SupabaseService).client;

  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'status' | 'items'>, items: Omit<OrderItem, 'id' | 'order_id'>[]) {
    const { data, error } = await this.supabase
      .from('orders')
      .insert({ ...order, status: 'pending' })
      .select('id')
      .single();
    if (error) throw error;

    const { error: itemsError } = await this.supabase
      .from('order_items')
      .insert(items.map(item => ({ ...item, order_id: data.id })));
    if (itemsError) throw itemsError;

    return data.id as string;
  }

  async getOrders(): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }

  async updateStatus(id: string, status: OrderStatus) {
    if (status === 'confirmed') {
      const { error } = await this.supabase.rpc('confirm_order', { order_id: id });
      if (error) throw error;
      return;
    }

    const { error } = await this.supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  }
}
