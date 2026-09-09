import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private supabase = inject(SupabaseService).client;

  async uploadImage(file: File): Promise<string> {
    const extension = file.name.split('.').pop() || 'jpg';
    const filePath = `${crypto.randomUUID()}.${extension}`;
    const bucket = 'product-images';

    const { error } = await this.supabase.storage.from(bucket).upload(filePath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) throw error;

    return this.supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
  }
}
