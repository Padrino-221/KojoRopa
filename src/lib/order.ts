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
  deliveryFee: number;
  total: number;
  address: {
    street: string;
    city: string;
    postal: string;
    country: string;
  };
}

const ORDER_PREFIX = process.env.NEXT_PUBLIC_ORDER_PREFIX ?? "KR-";

export function createOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.floor(Math.random() * 1296) // 36^2
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `${ORDER_PREFIX}${ts}${rand}`;
}
