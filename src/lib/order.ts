export interface OrderLine {
  slug: string;
  name: string;
  size: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  placedAt: string;
  email: string;
  name: string;
  items: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  address: {
    street: string;
    city: string;
    postal: string;
    country: string;
  };
}

export function createOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.floor(Math.random() * 1296) // 36^2
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `KR-${ts}${rand}`;
}
