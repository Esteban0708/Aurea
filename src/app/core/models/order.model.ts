export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

export interface OrderItem {
  id?: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_note: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  items?: OrderItem[];
}
