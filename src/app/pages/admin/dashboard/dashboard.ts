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
import { Order, OrderStatus } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import * as XLSX from 'xlsx';

interface ImportRow {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
}

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
  private orderService = inject(OrderService);
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
  importRows = signal<ImportRow[]>([]);
  importErrors = signal<string[]>([]);
  importFileName = signal('');
  importing = signal(false);
  importMessage = signal('');
  orders = signal<Order[]>([]);
  ordersLoading = signal(true);
  orderError = signal('');

  categoryOptions = computed(() => {
    const storedCategories = this.categories().map(category => category.name);
    const productCategories = this.products().map(product => product.category).filter(Boolean);
    return [...new Set([...storedCategories, ...productCategories])].sort();
  });

  lowStockProducts = computed(() => this.products().filter(product => product.stock <= 5));

  inventoryValue = computed(() =>
    this.products().reduce((total, product) => total + product.price * product.stock, 0)
  );

  confirmedOrders = computed(() => this.orders().filter(order => order.status === 'confirmed'));

  pendingOrders = computed(() => this.orders().filter(order => order.status === 'pending'));

  confirmedSalesValue = computed(() =>
    this.confirmedOrders().reduce((total, order) => total + Number(order.total), 0)
  );

  pendingSalesValue = computed(() =>
    this.pendingOrders().reduce((total, order) => total + Number(order.total), 0)
  );

  async ngOnInit() {
    await this.loadProducts();
    await this.loadCategories();
    await this.loadOrders();
  }

  async loadOrders() {
    this.ordersLoading.set(true);
    try {
      this.orders.set(await this.orderService.getOrders());
    } catch (error) {
      this.orderError.set('No se pudieron cargar los pedidos. Ejecuta la actualización de schema.sql.');
      console.error(error);
    } finally {
      this.ordersLoading.set(false);
    }
  }

  async updateOrderStatus(order: Order, status: OrderStatus) {
    try {
      await this.orderService.updateStatus(order.id, status);
      await Promise.all([this.loadOrders(), this.loadProducts()]);
    } catch (error) {
      this.orderError.set(status === 'confirmed'
        ? 'No se pudo confirmar: revisa que haya stock suficiente.'
        : 'No se pudo actualizar el pedido.');
      console.error(error);
    }
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

  async onExcelSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importFileName.set(file.name);
    this.importRows.set([]);
    this.importErrors.set([]);
    this.importMessage.set('');

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const validRows: ImportRow[] = [];
      const errors: string[] = [];

      rows.forEach((row, index) => {
        const line = index + 2;
        const normalized = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [this.normalizeHeader(key), value])
        );
        const name = String(normalized['name'] || '').trim();
        const price = Number(normalized['price']);
        const stock = Number(normalized['stock']);

        if (!name) errors.push(`Fila ${line}: falta el nombre.`);
        if (!Number.isFinite(price) || price < 0) errors.push(`Fila ${line}: el precio no es válido.`);
        if (!Number.isInteger(stock) || stock < 0) errors.push(`Fila ${line}: el stock debe ser un entero positivo.`);

        if (name && Number.isFinite(price) && price >= 0 && Number.isInteger(stock) && stock >= 0) {
          validRows.push({
            name,
            description: String(normalized['description'] || ''),
            price,
            stock,
            category: String(normalized['category'] || ''),
            image_url: String(normalized['image_url'] || '')
          });
        }
      });

      if (!rows.length) errors.push('El Excel no contiene filas de productos.');
      this.importRows.set(validRows);
      this.importErrors.set(errors);
    } catch (error) {
      this.importErrors.set(['No se pudo leer el archivo. Usa un Excel .xlsx o .xls válido.']);
      console.error(error);
    }
  }

  normalizeHeader(header: string) {
    return header.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll(' ', '_');
  }

  clearImport() {
    this.importRows.set([]);
    this.importErrors.set([]);
    this.importFileName.set('');
    this.importMessage.set('');
  }

  async importProducts() {
    if (!this.importRows().length) return;

    this.importing.set(true);
    this.importMessage.set('');
    try {
      await this.productService.addProducts(this.importRows());
      const importedCount = this.importRows().length;
      this.clearImport();
      this.importMessage.set(`${importedCount} productos se cargaron correctamente.`);
      await this.loadProducts();
    } catch (error) {
      this.importMessage.set('No se pudo cargar el inventario. Revisa los permisos de Supabase.');
      console.error(error);
    } finally {
      this.importing.set(false);
    }
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