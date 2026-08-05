export const ORDER_STATUSES = ["pending", "delivered", "failed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
