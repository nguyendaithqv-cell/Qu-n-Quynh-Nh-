# Security Specification: Quán 93 Full (Bếp Việt)

This document establishes the security architecture and invariants for the Firebase Firestore database of Quán 93 Full.

## 1. Data Invariants

- **Categories (`/categories/{categoryId}`)**:
  - Menu categories are read-only for public regular users.
  - Can only be modified by administrative interfaces (publicly secured/restricted client-side or admin-authenticated).
  - Validation: MUST contain `id`, `name`, `icon`, and optional `sortOrder` (number) and `type` ('food' or 'drink').

- **Products (`/products/{productId}`)**:
  - Menu products are read-only for public regular users.
  - Products MUST be bound to a valid `categoryId`.
  - Validation: MUST contain `id`, `name`, `categoryId`, `price` (number >= 0), `image` (string), `description` (string), and `isAvailable` (boolean). Optional `cost` is a number >= 0.

- **Promotions (`/promotions/{promotionId}`)**:
  - Discount codes/vouchers are read-only for public regular users.
  - Validation: MUST contain `id`, `code`, `type` ('percentage' | 'fixed'), `value` (number > 0), `minOrderValue` (number >= 0), and `isActive` (boolean).

- **Store Configuration (`/storeConfig/{docId}`)**:
  - Store config metadata is read-only for public regular users.
  - Validation: Document ID must strictly be `'global'`. Includes `name`, `address`, `phone`, `zaloHotline`, `bankName`, `bankAccount`, `bankAccountName`, `openHours`.

- **Orders (`/orders/{orderId}`)**:
  - Regular users can CREATE new orders (unauthenticated checkout/anonymous guest buy is supported by Quán 93, since it's a quick order Zalo/phone based applet).
  - Regular users can READ their own order if they list or fetch it (but order lists are filtered).
  - Regular users CANNOT edit existing orders (OrderStatus, PaymentStatus, items). Modifying the status is only allowed by the system/admin panel.
  - Regular users CANNOT delete orders.
  - Administrative/System writes can update all properties (including `status`, `paymentStatus`, `adminNote`, `cancellationReason`).

---

## 2. The Dirty Dozen Payloads

Here are 12 specific payloads attempt vector scenarios that our security rules explicitly reject:

1. **Category Shadow Creation**: Try to inject a category with an unapproved/extra field `isFeatured: true`.
2. **Category Spoof Admin Delete**: Unauthorized guest trying to delete category `/categories/pho`.
3. **Product Price Poisoning**: Try to create an ultra-expensive dish with `price: -100` or a non-numeric string.
4. **Product Invalid Category Reference**: Try to create a product referencing a non-existent or malformed `categoryId` string.
5. **Promotion Value Injection**: Force-create positive coupon `type: 'percentage'` with `value: 1000` (beyond 100%).
6. **Promotion Spoof State Disable**: Try to deactivate active coupons without authorization.
7. **Store Config Unauthorized Write**: Attempt to overwrite core store banking credentials (`bankAccount`) with malformed accounts.
8. **Store Config Doc ID Poisoning**: Write store configurations to `/storeConfig/spoofed_config`.
9. **Order Identity Override**: Try to overwrite an existing customer's placed order status to `'completed'` or `'preparing'`.
10. **Order Amount Forgery**: Try to submit a guest order where `totalAmount` is negative or missing.
11. **Order Status Escalation**: Standard client trying to change order status from `'pending'` to `'completed'` without PIN/admin clearance.
12. **Order Denial of Wallet / Spam Write**: Try to inject extreme size details (`customerAddress` containing 5MB of junk values).

---

## 3. The Test Validation Specs

Our rules will reject all of these payloads by enforcing:
- Default `allow read, write: if false;` catch-all master gate.
- String constraints checking sizes (`.size() < 256` or more as relevant).
- Specific write restrictions of non-admins.
- Mandatory schema keys validations.
