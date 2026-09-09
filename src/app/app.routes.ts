import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/catalog/catalog').then(m => m.Catalog) },
  { path: 'producto/:id', loadComponent: () => import('./pages/product-detail/product-detail').then(m => m.ProductDetail) },
  { path: 'carrito', loadComponent: () => import('./pages/cart/cart').then(m => m.Cart) },
  { path: 'admin/login', loadComponent: () => import('./pages/admin/login/login').then(m => m.Login) },
  { path: 'admin', loadComponent: () => import('./pages/admin/dashboard/dashboard').then(m => m.Dashboard), canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];