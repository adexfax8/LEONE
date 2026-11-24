import { relations, sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey,
  text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
// Money: exact decimal strings (never floats). Base-currency amounts unless stated.
const money = (name: string) => numeric(name, { precision: 14, scale: 2 });

export const adminRole = pgEnum("admin_role", ["OWNER", "MANAGER", "STAFF", "SUPPORT"]);
export const productStatus = pgEnum("product_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);
export const orderStatus = pgEnum("order_status", [
  "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED",
]);
export const paymentStatus = pgEnum("payment_status", [
  "INITIATED", "PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED",
]);
export const paymentProvider = pgEnum("payment_provider", ["PAYSTACK", "FLUTTERWAVE", "STRIPE"]);
export const requestType = pgEnum("request_type", ["SELL", "SWAP", "BUY"]);
export const requestStatus = pgEnum("request_status", [
  "SUBMITTED", "IN_REVIEW", "QUOTED", "ACCEPTED", "REJECTED", "COMPLETED",
]);
export const movementType = pgEnum("movement_type", [
  "INITIAL", "PURCHASE", "SALE", "ADJUSTMENT", "RETURN", "IMPORT",
]);
export const discountType = pgEnum("discount_type", ["PERCENT", "FIXED"]);

// ---------- Users ----------
export const adminUsers = pgTable("admin_users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("STAFF"),
  active: boolean("active").notNull().default(true),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const customers = pgTable("customers", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  active: boolean("active").notNull().default(true),
  country: text("country"),
  currency: text("currency"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const addresses = pgTable("addresses", {
  id: id(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  city: text("city").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  postalCode: text("postal_code"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("addresses_customer_idx").on(t.customerId)]);

// ---------- Catalogue ----------
export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: text("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
}, (t) => [index("categories_parent_idx").on(t.parentId)]);

export const brands = pgTable("brands", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").notNull().default(true),
});

export const products = pgTable("products", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  status: productStatus("status").notNull().default("DRAFT"),
  categoryId: text("category_id").references(() => categories.id),
  brandId: text("brand_id").references(() => brands.id),
  // Stored once in the base currency; displayed prices are converted at read time.
  basePrice: money("base_price").notNull(),
  compareAtPrice: money("compare_at_price"),
  specs: jsonb("specs").$type<Record<string, string>>(),
  featured: boolean("featured").notNull().default(false),
  bestSeller: boolean("best_seller").notNull().default(false),
  newArrival: boolean("new_arrival").notNull().default(false),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("products_status_category_idx").on(t.status, t.categoryId),
  index("products_brand_idx").on(t.brandId),
  index("products_status_featured_idx").on(t.status, t.featured),
  index("products_created_idx").on(t.createdAt),
  index("products_name_lower_idx").on(sql`lower(${t.name})`),
]);

export const productVariants = pgTable("product_variants", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  options: jsonb("options").$type<Record<string, string>>(),
  priceOverride: money("price_override"),
  stock: integer("stock").notNull().default(0),
  lowStockAt: integer("low_stock_at").notNull().default(3),
  active: boolean("active").notNull().default(true),
}, (t) => [
  index("variants_product_idx").on(t.productId),
  index("variants_stock_idx").on(t.stock),
]);

export const productImages = pgTable("product_images", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("images_product_idx").on(t.productId)]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: id(),
  variantId: text("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  type: movementType("type").notNull(),
  delta: integer("delta").notNull(),
  balance: integer("balance").notNull(),
  reason: text("reason"),
  reference: text("reference"),
  actorId: text("actor_id"),
  createdAt: createdAt(),
}, (t) => [index("movements_variant_idx").on(t.variantId, t.createdAt)]);

// ---------- Currency / geography ----------
export const currencies = pgTable("currencies", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimals: integer("decimals").notNull().default(2),
  enabled: boolean("enabled").notNull().default(true),
  // Units of this currency per 1 unit of the base currency.
  rate: numeric("rate", { precision: 24, scale: 10 }).notNull(),
  rateSource: text("rate_source").notNull().default("manual"),
  manualRate: boolean("manual_rate").notNull().default(false),
  marginPct: numeric("margin_pct", { precision: 6, scale: 3 }).notNull().default("0"),
  updatedAt: updatedAt(),
});

export const shippingZones = pgTable("shipping_zones", {
  id: id(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const countries = pgTable("countries", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  defaultCurrency: text("default_currency"),
  shippingEnabled: boolean("shipping_enabled").notNull().default(false),
  zoneId: text("zone_id").references(() => shippingZones.id),
});

export const shippingMethods = pgTable("shipping_methods", {
  id: id(),
  zoneId: text("zone_id").notNull().references(() => shippingZones.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isPickup: boolean("is_pickup").notNull().default(false),
  fee: money("fee").notNull(),
  freeOverAmount: money("free_over_amount"),
  minDays: integer("min_days"),
  maxDays: integer("max_days"),
  active: boolean("active").notNull().default(true),
}, (t) => [index("shipping_methods_zone_idx").on(t.zoneId)]);

export const taxRules = pgTable("tax_rules", {
  id: id(),
  countryCode: text("country_code").notNull().references(() => countries.code),
  region: text("region"),
  name: text("name").notNull(),
  ratePct: numeric("rate_pct", { precision: 6, scale: 3 }).notNull(), // admin-configured, never invented
  inclusive: boolean("inclusive").notNull().default(false),
  active: boolean("active").notNull().default(true),
}, (t) => [index("tax_rules_country_idx").on(t.countryCode)]);

// ---------- Orders & payments ----------
export const orders = pgTable("orders", {
  id: id(),
  number: text("number").notNull().unique(),
  customerId: text("customer_id").references(() => customers.id),
  email: text("email").notNull(),
  status: orderStatus("status").notNull().default("PENDING_PAYMENT"),
  baseCurrency: text("base_currency").notNull(),
  displayCurrency: text("display_currency").notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 24, scale: 10 }).notNull(),
  chargeCurrency: text("charge_currency").notNull(),
  chargeRate: numeric("charge_rate", { precision: 24, scale: 10 }).notNull(),
  subtotalBase: money("subtotal_base").notNull(),
  shippingBase: money("shipping_base").notNull(),
  taxBase: money("tax_base").notNull(),
  discountBase: money("discount_base").notNull().default("0"),
  totalBase: money("total_base").notNull(),
  totalCharge: money("total_charge").notNull(), // amount in chargeCurrency
  taxBreakdown: jsonb("tax_breakdown"),
  shippingMethodName: text("shipping_method_name"),
  shipName: text("ship_name").notNull(),
  shipPhone: text("ship_phone").notNull(),
  shipCountry: text("ship_country").notNull(),
  shipRegion: text("ship_region"),
  shipCity: text("ship_city").notNull(),
  shipLine1: text("ship_line1").notNull(),
  shipLine2: text("ship_line2"),
  shipPostalCode: text("ship_postal_code"),
  deliveryNotes: text("delivery_notes"),
  discountCode: text("discount_code"),
  trackingNumber: text("tracking_number"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("orders_customer_idx").on(t.customerId),
  index("orders_status_created_idx").on(t.status, t.createdAt),
  index("orders_country_idx").on(t.shipCountry),
]);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: text("variant_id").references(() => productVariants.id),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  unitPriceBase: money("unit_price_base").notNull(),
  quantity: integer("quantity").notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const payments = pgTable("payments", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id),
  provider: paymentProvider("provider").notNull(),
  reference: text("reference").notNull().unique(),
  providerRef: text("provider_ref"),
  currency: text("currency").notNull(),
  amount: money("amount").notNull(),
  status: paymentStatus("status").notNull().default("INITIATED"),
  failureReason: text("failure_reason"),
  rawResponse: jsonb("raw_response"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status)]);

// Idempotent webhook processing: (provider, eventId) is unique.
export const webhookEvents = pgTable("webhook_events", {
  id: id(),
  provider: paymentProvider("provider").notNull(),
  eventId: text("event_id").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("webhook_provider_event_uq").on(t.provider, t.eventId)]);

// ---------- Marketing / content ----------
export const promotions = pgTable("promotions", {
  id: id(),
  code: text("code").notNull().unique(),
  type: discountType("type").notNull(),
  value: money("value").notNull(),
  minSubtotal: money("min_subtotal"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const banners = pgTable("banners", {
  id: id(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const reviews = pgTable("reviews", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  body: text("body"),
  approved: boolean("approved").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("reviews_product_idx").on(t.productId, t.approved)]);

export const wishlistItems = pgTable("wishlist_items", {
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.customerId, t.productId] })]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: id(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
});

// Buy / Sell / Swap
export const tradeRequests = pgTable("trade_requests", {
  id: id(),
  reference: text("reference").notNull().unique(),
  type: requestType("type").notNull(),
  status: requestStatus("status").notNull().default("SUBMITTED"),
  customerId: text("customer_id").references(() => customers.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  deviceName: text("device_name").notNull(),
  condition: text("condition").notNull(),
  specs: text("specs"),
  askingPrice: money("asking_price"),
  swapFor: text("swap_for"),
  photoUrls: text("photo_urls").array().notNull().default(sql`'{}'::text[]`),
  adminNotes: text("admin_notes"),
  quote: money("quote"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("trade_type_status_idx").on(t.type, t.status)]);

// ---------- System ----------
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => adminUsers.id),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  ip: text("ip"),
  createdAt: createdAt(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId)]);

// ---------- Relations ----------
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  variants: many(productVariants),
  images: many(productImages),
  reviews: many(reviews),
}));
export const variantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));
export const imagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  payments: many(payments),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
