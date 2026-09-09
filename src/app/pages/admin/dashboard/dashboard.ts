import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { StorageService } from '../../../core/services/storage';
import { AuthService } from '../../../core/services/auth';
import { Product } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private storageService = inject(StorageService);
  private auth = inject(AuthService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  categorySaving = signal(false);
  categoryError = signal('');
  newCategory = '';

  // formulario (null = modo "crear", objeto = modo "editar")
  editingId = signal<string | null>(null);
  form: Partial<Product> = this.emptyForm();
  selectedFile: File | null = null;

  categoryOptions = computed(() => {
    const storedCategories = this.categories().map(category => category.name);
    const productCategories = this.products().map(product => product.category).filter(Boolean);
    return [...new Set([...storedCategories, ...productCategories])].sort();
  });

  lowStockProducts = computed(() => this.products().filter(product => product.stock <= 5));

  inventoryValue = computed(() =>
    this.products().reduce((total, product) => total + product.price * product.stock, 0)
  );

  async ngOnInit() {
    await this.loadProducts();
    await this.loadCategories();
  }

  async loadCategories() {
    try {
      this.categories.set(await this.categoryService.getCategories());
    } catch (error) {
      this.categoryError.set('Crea la tabla categories en Supabase para guardar categorías nuevas.');
      console.error(error);
    }
  }

  async loadProducts() {
    this.loading.set(true);
    try {
      this.products.set(await this.productService.getProducts());
    } finally {
      this.loading.set(false);
    }
  }

  emptyForm(): Partial<Product> {
    return { name: '', description: '', price: 0, stock: 0, category: '', image_url: '' };
  }

  async createCategory() {
    const name = this.newCategory.trim();
    if (!name || this.categoryOptions().some(category => category.toLowerCase() === name.toLowerCase())) return;

    this.categorySaving.set(true);
    this.categoryError.set('');
    try {
      await this.categoryService.addCategory(name);
      this.newCategory = '';
      await this.loadCategories();
    } catch (error) {
      this.categoryError.set('No se pudo guardar la categoría. Revisa la tabla categories en Supabase.');
      console.error(error);
    } finally {
      this.categorySaving.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  editProduct(product: Product) {
    this.editingId.set(product.id!);
    this.form = { ...product };
  }

  cancelEdit() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.selectedFile = null;
  }

  async onSubmit() {
    this.saving.set(true);
    try {
      if (this.selectedFile) {
        this.form.image_url = await this.storageService.uploadImage(this.selectedFile);
      }

      if (this.editingId()) {
        await this.productService.updateProduct(this.editingId()!, this.form);
      } else {
        await this.productService.addProduct(this.form as Product);
      }

      this.cancelEdit();
      await this.loadProducts();
    } catch (e) {
      alert('Error al guardar el producto');
      console.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteProduct(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    await this.productService.deleteProduct(id);
    await this.loadProducts();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}