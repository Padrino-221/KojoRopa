// "paid" means the payment was confirmed (set by the webhook / OTP / status
// poll). It is NOT set by admins — admins move a paid order to "delivered"
// once it's fulfilled, or to "failed" if it can't be fulfilled.
export const ORDER_STATUSES = ["pending", "paid", "delivered", "failed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
