// core/services/product.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private supabase = inject(SupabaseService).client;

  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.supabase.from('products').select('*');
    if (error) throw error;
    return data as Product[];
  }

  async addProduct(product: Product) {
    const { error } = await this.supabase.from('products').insert(product);
    if (error) throw error;
  }

  async addProducts(products: Omit<Product, 'id' | 'created_at'>[]) {
    const { error } = await this.supabase.from('products').insert(products);
    if (error) throw error;
  }

  async updateProduct(id: string, product: Partial<Product>) {
    const { error } = await this.supabase.from('products').update(product).eq('id', id);
    if (error) throw error;
  }

  async deleteProduct(id: string) {
    const { error } = await this.supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }
}