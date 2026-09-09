import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Category } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private supabase = inject(SupabaseService).client;

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Category[];
  }

  async addCategory(name: string) {
    const { error } = await this.supabase.from('categories').insert({ name });
    if (error) throw error;
  }

  async deleteCategory(id: string) {
    const { error } = await this.supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }
}
