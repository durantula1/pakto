import {
  bigint,
  boolean,
  char,
  date,
  foreignKey,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appSchema = pgSchema("app");

export const memberRole = appSchema.enum("member_role", [
  "owner",
  "admin",
  "member",
  "field",
  "office",
]);
export const memberPermission = appSchema.enum("member_permission", [
  "projects.create",
  "milestones.manage",
  "offers.edit",
  "changes.draft",
  "documents.send",
  "drafts.view_all",
  "notes.view",
  "payments.record",
  "finance.view",
  "clients.manage",
]);
export const memberStatus = appSchema.enum("member_status", [
  "active",
  "invited",
  "disabled",
]);
export const customerKind = appSchema.enum("customer_kind", [
  "person",
  "company",
]);
export const orderStage = appSchema.enum("order_stage", [
  "draft",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_for_installation",
  "installed",
  "completed",
  "service",
]);
export const versionStatus = appSchema.enum("version_status", [
  "published",
  "awaiting_approval",
  "approved",
  "superseded",
]);
export const templateScope = appSchema.enum("template_scope", [
  "platform",
  "organization",
]);
export const specificationFieldType = appSchema.enum(
  "specification_field_type",
  [
    "short_text",
    "long_text",
    "integer",
    "decimal",
    "measurement",
    "single_select",
    "boolean",
    "date",
    "money",
    "colour",
    "file",
    "image_gallery",
  ],
);
export const fileCategory = appSchema.enum("file_category", [
  "drawing",
  "render",
  "photo",
  "document",
  "warranty",
  "installation",
  "review_request",
]);
export const portalScope = appSchema.enum("portal_scope", [
  "review",
  "installation_acceptance",
  "after_sales",
]);
export const reviewState = appSchema.enum("review_state", [
  "comment",
  "changes_requested",
]);
export const paymentKind = appSchema.enum("payment_kind", [
  "deposit",
  "progress",
  "final",
  "other",
]);
export const acceptanceStatus = appSchema.enum("acceptance_status", [
  "pending",
  "accepted",
  "issues",
]);
export const serviceStatus = appSchema.enum("service_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const actorType = appSchema.enum("actor_type", [
  "user",
  "customer",
  "system",
]);
export const notificationStatus = appSchema.enum("notification_status", [
  "pending",
  "processing",
  "sent",
  "failed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const profiles = appSchema.table("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  /** Set when the user asks to delete the account; the purge job runs after the grace period. */
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
  /** Set once the auth user is gone and the row is anonymized. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("profiles_deletion_due_idx").on(table.deletionRequestedAt).where(sql`${table.deletionRequestedAt} is not null and ${table.deletedAt} is null`),
]);

export const userConsents = appSchema.table(
  "user_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    document: text("document", { enum: ["terms", "privacy"] }).notNull(),
    version: text("version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_consents_user_document_version_uidx").on(table.userId, table.document, table.version)],
);

export const organizations = appSchema.table(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoStoragePath: text("logo_storage_path"),
    /** small | medium | large; see logoBox() in src/modules/organizations/logo-box.ts. */
    logoSize: text("logo_size", { enum: ["small", "medium", "large"] }).notNull().default("medium"),
    brandColor: text("brand_color"),
    /** The company's public phone; the client portal offers it as call and Viber buttons. */
    phone: text("phone"),
    defaultCurrency: char("default_currency", { length: 3 })
      .notNull()
      .default("EUR"),
    defaultLocale: text("default_locale").notNull().default("bg"),
    orderNumberPrefix: text("order_number_prefix").notNull().default("MF"),
    nextOrderNumber: bigint("next_order_number", { mode: "number" })
      .notNull()
      .default(1),
    defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("20.00"),
    portalSessionDays: integer("portal_session_days").notNull().default(30),
    offerValidityDays: integer("offer_validity_days").notNull().default(14),
    /** Days of silence before the client gets a reminder; 0 = never. */
    clientNudgeAfterDays: integer("client_nudge_after_days").notNull().default(3),
    /** Days before an offer expires that the client is warned; 0 = never. */
    clientExpiryWarningDays: integer("client_expiry_warning_days").notNull().default(2),
    clientScheduleDigestEnabled: boolean("client_schedule_digest_enabled").notNull().default(true),
    /** Days ahead a stage counts as "coming up" on the dashboard and in the stages list. */
    stageWarningDays: integer("stage_warning_days").notNull().default(7),
    stepUpThreshold: numeric("step_up_threshold", {
      precision: 14,
      scale: 2,
    }),
    /** Set when the sole member deletes their account; app.purge_organization() removes the company later. */
    closureRequestedAt: timestamp("closure_requested_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)],
);

export const organizationMembers = appSchema.table(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: memberRole("role").notNull(),
    status: memberStatus("status").notNull().default("active"),
    permissions: memberPermission("permissions").array().notNull().default([]),
    allProjects: boolean("all_projects").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_idx").on(table.userId, table.status),
  ],
);

export const customers = appSchema.table(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    kind: customerKind("kind").notNull().default("person"),
    name: text("name").notNull(),
    companyName: text("company_name"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("customers_org_id_unique").on(table.organizationId, table.id),
    index("customers_org_name_idx").on(table.organizationId, table.name),
    index("customers_org_phone_idx").on(table.organizationId, table.phone),
    index("customers_org_email_idx").on(table.organizationId, table.email),
  ],
);

export const specificationTemplates = appSchema.table(
  "specification_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: templateScope("scope").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    nameBg: text("name_bg").notNull(),
    nameEn: text("name_en"),
    version: integer("version").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("specification_templates_scope_key_version_uidx").on(
      table.scope,
      table.organizationId,
      table.key,
      table.version,
    ),
  ],
);

export const specificationTemplateFields = appSchema.table(
  "specification_template_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => specificationTemplates.id, { onDelete: "cascade" }),
    stableKey: text("stable_key").notNull(),
    sectionKey: text("section_key").notNull(),
    sectionLabel: text("section_label").notNull(),
    label: text("label").notNull(),
    fieldType: specificationFieldType("field_type").notNull(),
    unit: text("unit"),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
    optionsJson: jsonb("options_json").$type<string[]>(),
    configJson: jsonb("config_json").$type<Record<string, unknown>>(),
  },
  (table) => [
    uniqueIndex("template_fields_stable_key_uidx").on(
      table.templateId,
      table.stableKey,
    ),
    index("template_fields_sort_idx").on(table.templateId, table.sortOrder),
  ],
);

export const organizationTemplateFieldOverrides = appSchema.table(
  "organization_template_field_overrides",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => specificationTemplateFields.id, {
        onDelete: "cascade",
      }),
    label: text("label"),
    hidden: boolean("hidden").notNull().default(false),
    sortOrder: integer("sort_order"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.fieldId] })],
);

export const orders = appSchema.table(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").notNull(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => specificationTemplates.id, { onDelete: "restrict" }),
    orderNumber: text("order_number").notNull(),
    title: text("title").notNull(),
    stage: orderStage("stage").notNull().default("draft"),
    siteAddress: text("site_address"),
    targetDeliveryDate: date("target_delivery_date"),
    currentApprovedVersionId: uuid("current_approved_version_id"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    currentTotalMinor: bigint("current_total_minor", { mode: "bigint" }),
    depositRequiredMinor: bigint("deposit_required_minor", { mode: "bigint" }),
    depositPaidMinor: bigint("deposit_paid_minor", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    createdBy: uuid("created_by").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("orders_org_id_unique").on(table.organizationId, table.id),
    uniqueIndex("orders_org_number_uidx").on(
      table.organizationId,
      table.orderNumber,
    ),
    index("orders_org_stage_updated_idx").on(
      table.organizationId,
      table.stage,
      table.updatedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customers.organizationId, customers.id],
      name: "orders_customer_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const orderDrafts = appSchema.table(
  "order_drafts",
  {
    orderId: uuid("order_id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    valuesJson: jsonb("values_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    commercialJson: jsonb("commercial_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    templateSnapshotJson: jsonb("template_snapshot_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    updatedBy: uuid("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revision: bigint("revision", { mode: "number" }).notNull().default(1),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "order_drafts_order_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const specificationVersions = appSchema.table(
  "specification_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: versionStatus("status").notNull().default("published"),
    snapshotJson: jsonb("snapshot_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    commercialSnapshotJson: jsonb("commercial_snapshot_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    contentHash: text("content_hash").notNull(),
    changeSummaryJson: jsonb("change_summary_json").$type<unknown[]>(),
    priceDeltaMinor: bigint("price_delta_minor", { mode: "bigint" }),
    deliveryDeltaDays: integer("delivery_delta_days"),
    createdBy: uuid("created_by").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (table) => [
    unique("specification_versions_org_id_unique").on(
      table.organizationId,
      table.id,
    ),
    uniqueIndex("specification_versions_order_number_uidx").on(
      table.orderId,
      table.versionNumber,
    ),
    index("specification_versions_order_status_idx").on(
      table.organizationId,
      table.orderId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "specification_versions_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const orderFiles = appSchema.table(
  "order_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    category: fileCategory("category").notNull(),
    storageBucket: text("storage_bucket").notNull().default("order-files"),
    storagePath: text("storage_path").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("order_files_org_id_unique").on(table.organizationId, table.id),
    uniqueIndex("order_files_storage_path_uidx").on(
      table.storageBucket,
      table.storagePath,
    ),
    index("order_files_order_idx").on(table.organizationId, table.orderId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "order_files_order_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const versionFiles = appSchema.table(
  "version_files",
  {
    organizationId: uuid("organization_id").notNull(),
    versionId: uuid("version_id").notNull(),
    fileId: uuid("file_id").notNull(),
    manifestJson: jsonb("manifest_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.versionId, table.fileId] }),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "version_files_version_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.fileId],
      foreignColumns: [orderFiles.organizationId, orderFiles.id],
      name: "version_files_file_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const portalLinks = appSchema.table(
  "portal_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionId: uuid("version_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    scope: portalScope("scope").notNull().default("review"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("portal_links_token_hash_uidx").on(table.tokenHash),
    uniqueIndex("portal_links_active_review_order_uidx")
      .on(table.organizationId, table.orderId)
      .where(
        sql`${table.scope} = 'review'::app.portal_scope and ${table.revokedAt} is null`,
      ),
    index("portal_links_version_idx").on(table.organizationId, table.versionId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "portal_links_order_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "portal_links_version_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const approvals = appSchema.table(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionId: uuid("version_id").notNull(),
    portalLinkId: uuid("portal_link_id")
      .notNull()
      .references(() => portalLinks.id, { onDelete: "restrict" }),
    contentHash: text("content_hash").notNull(),
    approverName: text("approver_name").notNull(),
    approverEmail: text("approver_email"),
    approvedAt: timestamp("approved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userAgent: text("user_agent"),
    confirmationText: text("confirmation_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("approvals_version_uidx").on(table.versionId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "approvals_order_tenant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "approvals_version_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const reviewRequests = appSchema.table(
  "review_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionId: uuid("version_id").notNull(),
    portalLinkId: uuid("portal_link_id")
      .notNull()
      .references(() => portalLinks.id, { onDelete: "restrict" }),
    state: reviewState("state").notNull(),
    message: text("message").notNull(),
    customerName: text("customer_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("review_requests_order_open_idx").on(
      table.organizationId,
      table.orderId,
      table.resolvedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "review_requests_version_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const quoteItems = appSchema.table(
  "quote_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unit: text("unit"),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    ...timestamps,
  },
  (table) => [
    index("quote_items_order_sort_idx").on(
      table.organizationId,
      table.orderId,
      table.sortOrder,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "quote_items_order_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const payments = appSchema.table(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    kind: paymentKind("kind").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_order_paid_idx").on(
      table.organizationId,
      table.orderId,
      table.paidAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "payments_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const installations = appSchema.table(
  "installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    installedAt: timestamp("installed_at", { withTimezone: true }),
    notes: text("notes"),
    acceptanceStatus: acceptanceStatus("acceptance_status")
      .notNull()
      .default("pending"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("installations_order_uidx").on(table.orderId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "installations_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const warrantyItems = appSchema.table(
  "warranty_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    serialNumber: text("serial_number"),
    warrantyStart: date("warranty_start"),
    warrantyEnd: date("warranty_end"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("warranty_items_order_idx").on(table.organizationId, table.orderId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "warranty_items_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const serviceRequests = appSchema.table(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    warrantyItemId: uuid("warranty_item_id").references(
      () => warrantyItems.id,
      {
        onDelete: "set null",
      },
    ),
    status: serviceStatus("status").notNull().default("open"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("service_requests_order_status_idx").on(
      table.organizationId,
      table.orderId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "service_requests_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const activityEvents = appSchema.table(
  "activity_events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    orderId: uuid("order_id"),
    actorType: actorType("actor_type").notNull(),
    actorUserId: uuid("actor_user_id"),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_events_order_time_idx").on(
      table.organizationId,
      table.orderId,
      table.createdAt,
    ),
  ],
);

export const notificationOutbox = appSchema.table(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    eventType: text("event_type").notNull(),
    recipient: text("recipient").notNull(),
    payloadJson: jsonb("payload_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_outbox_idempotency_uidx").on(
      table.idempotencyKey,
    ),
    index("notification_outbox_delivery_idx").on(
      table.status,
      table.availableAt,
    ),
  ],
);

// Change-order domain. The previous passport tables intentionally remain
// available for data migration, but the application reads and writes these tables.
export const projectStatus = appSchema.enum("project_status", [
  "active",
  "completed",
  "archived",
]);
export const projectPermission = appSchema.enum("project_permission", [
  "view",
  "draft",
  "send",
  "manage",
]);
export const portalContactRole = appSchema.enum("portal_contact_role", [
  "viewer",
  "approver",
]);
export const changeLifecycleStatus = appSchema.enum("change_lifecycle_status", [
  "draft",
  "open",
  "resolved",
  "canceled",
]);
export const changeWorkStatus = appSchema.enum("change_work_status", [
  "not_started",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
]);
export const changeRevisionStatus = appSchema.enum("change_revision_status", [
  "draft",
  "sent",
  "viewed",
  "approved",
  "declined",
  "changes_requested",
  "canceled",
  "expired",
  "superseded",
]);
export const changeKind = appSchema.enum("change_kind", [
  "addition",
  "credit",
  "no_cost",
  "schedule_only",
]);
export const documentKind = appSchema.enum("document_kind", [
  "offer",
  "change",
]);
export const scheduleImpactType = appSchema.enum("schedule_impact_type", [
  "none",
  "days",
  "unknown",
]);
export const changeDecision = appSchema.enum("change_decision", [
  "approved",
  "declined",
  "changes_requested",
]);
export const timelineActorType = appSchema.enum("timeline_actor_type", [
  "staff",
  "portal_contact",
  "system",
  "ai",
]);
export const timelineVisibility = appSchema.enum("timeline_visibility", [
  "internal",
  "client",
]);
export const attachmentKind = appSchema.enum("attachment_kind", [
  "image",
  "audio",
  "document",
]);
export const attachmentVisibility = appSchema.enum("attachment_visibility", [
  "internal",
  "client",
]);

/** A natural person the organization works for; may have several projects (docs/clients-plan.md). */
export const clients = appSchema.table(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    email: text("email"),
    emailNormalized: text("email_normalized").generatedAlwaysAs(sql`nullif(lower(btrim(email)), '')`),
    phone: text("phone"),
    /** Digits with a leading +, set by the app; used to suggest duplicates. */
    phoneNormalized: text("phone_normalized"),
    address: text("address"),
    notes: text("notes"),
    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => clients.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (table) => [
    unique("clients_org_id_unique").on(table.organizationId, table.id),
    index("clients_org_name_idx").on(table.organizationId, table.name),
    index("clients_org_email_idx").on(table.organizationId, table.emailNormalized).where(sql`${table.emailNormalized} is not null`),
    index("clients_org_phone_idx").on(table.organizationId, table.phoneNormalized).where(sql`${table.phoneNormalized} is not null`),
  ],
);

export const projects = appSchema.table(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    publicId: uuid("public_id").notNull().defaultRandom(),
    name: text("name").notNull(),
    siteAddress: text("site_address").notNull(),
    reference: text("reference"),
    status: projectStatus("status").notNull().default("active"),
    createdBy: uuid("created_by").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    /** Last time the client got the daily progress email for this project. */
    clientDigestAt: timestamp("client_digest_at", { withTimezone: true }),
    /** The contracting client; set at creation and never changed (a trigger guards it). */
    clientId: uuid("client_id").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("projects_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [clients.organizationId, clients.id],
      name: "projects_client_tenant_fk",
    }).onDelete("restrict"),
    index("projects_org_client_idx").on(table.organizationId, table.clientId),
    uniqueIndex("projects_public_id_uidx").on(table.publicId),
    index("projects_org_status_updated_idx").on(
      table.organizationId,
      table.status,
      table.updatedAt,
    ),
    index("projects_org_updated_active_idx")
      .on(table.organizationId, table.updatedAt.desc())
      .where(sql`${table.archivedAt} is null`),
  ],
);

export const projectMembers = appSchema.table(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    permission: projectPermission("permission").notNull().default("view"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("project_members_user_idx").on(table.userId, table.projectId),
  ],
);

export const projectContacts = appSchema.table(
  "project_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    /** The person behind this invitation; name, email and phone here stay a per-project snapshot. */
    clientId: uuid("client_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    portalRole: portalContactRole("portal_role").notNull().default("approver"),
    isPrimary: boolean("is_primary").notNull().default(true),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    /** A removed contact keeps its history but its links stop working. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_contacts_project_idx").on(table.projectId),
    index("project_contacts_client_idx").on(table.clientId),
    uniqueIndex("project_contacts_one_per_client_uidx").on(table.projectId, table.clientId).where(sql`${table.removedAt} is null`),
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
      name: "project_contacts_project_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [clients.organizationId, clients.id],
      name: "project_contacts_client_tenant_fk",
    }).onDelete("restrict"),
    uniqueIndex("project_contacts_one_approver_uidx")
      .on(table.projectId)
      .where(sql`${table.isPrimary} and ${table.portalRole} = 'approver' and ${table.removedAt} is null`),
  ],
);

export const portalGrants = appSchema.table(
  "portal_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectContactId: uuid("project_contact_id")
      .notNull()
      .references(() => projectContacts.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    tokenCiphertext: text("token_ciphertext"),
    scope: text("scope").array().notNull().default(["view", "decide"]),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastExchangedAt: timestamp("last_exchanged_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("portal_grants_token_hash_uidx").on(table.tokenHash),
    index("portal_grants_project_contact_idx").on(
      table.projectId,
      table.projectContactId,
    ),
  ],
);

export const portalSessions = appSchema.table(
  "portal_sessions",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    portalGrantId: uuid("portal_grant_id")
      .notNull()
      .references(() => portalGrants.id, { onDelete: "cascade" }),
    sessionHash: text("session_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdIp: inet("created_ip"),
    userAgent: text("user_agent"),
    /** Set for a client-wide session; `portalGrantId` is the link it started from. */
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    /** The client confirmed a code in this session; until then only the starting project is open. */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("portal_sessions_session_hash_uidx").on(table.sessionHash),
    index("portal_sessions_grant_idx").on(table.portalGrantId),
    index("portal_sessions_client_idx").on(table.clientId).where(sql`${table.clientId} is not null`),
  ],
);

export const changeOrders = appSchema.table(
  "change_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
    documentKind: documentKind("document_kind").notNull().default("change"),
    baselineOfferId: uuid("baseline_offer_id"),
    /** The version being worked on: a draft, or the one awaiting the client. */
    currentRevisionId: bigint("current_revision_id", { mode: "number" }),
    /**
     * The version in force: the last one the client approved. Moves only on approval.
     * Like `currentRevisionId`, its foreign key (to a revision of this same document) lives in SQL only.
     */
    approvedRevisionId: bigint("approved_revision_id", { mode: "number" }),
    lifecycleStatus: changeLifecycleStatus("lifecycle_status")
      .notNull()
      .default("draft"),
    workStatus: changeWorkStatus("work_status")
      .notNull()
      .default("not_started"),
    /** The approved offer version that includes this change; the change then no longer adds to the price. */
    absorbedByRevisionId: bigint("absorbed_by_revision_id", { mode: "number" }),
    createdBy: uuid("created_by").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("change_orders_project_id_uidx").on(table.projectId, table.id),
    uniqueIndex("change_orders_project_kind_sequence_uidx").on(
      table.projectId,
      table.documentKind,
      table.sequenceNumber,
    ),
    index("change_orders_baseline_idx").on(table.baselineOfferId),
    foreignKey({
      columns: [table.baselineOfferId],
      foreignColumns: [table.id],
      name: "change_orders_baseline_offer_id_change_orders_id_fk",
    }).onDelete("restrict"),
    index("change_orders_project_status_updated_idx").on(
      table.projectId,
      table.lifecycleStatus,
      table.updatedAt,
    ),
    index("change_orders_org_idx").on(table.organizationId),
    index("change_orders_org_kind_updated_idx")
      .on(table.organizationId, table.documentKind, table.updatedAt.desc())
      .where(sql`${table.archivedAt} is null`),
    index("change_orders_project_kind_updated_idx")
      .on(table.projectId, table.documentKind, table.updatedAt.desc())
      .where(sql`${table.archivedAt} is null`),
  ],
);

export const changeOrderRevisions = appSchema.table(
  "change_order_revisions",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    changeOrderId: uuid("change_order_id")
      .notNull()
      .references(() => changeOrders.id, { onDelete: "restrict" }),
    revisionNumber: integer("revision_number").notNull(),
    status: changeRevisionStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    reason: text("reason"),
    changeKind: changeKind("change_kind").notNull().default("addition"),
    pricingType: text("pricing_type").notNull().default("fixed"),
    currency: char("currency", { length: 3 }).notNull(),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    scheduleImpactType: scheduleImpactType("schedule_impact_type")
      .notNull()
      .default("none"),
    scheduleImpactDays: integer("schedule_impact_days"),
    agreedDeadline: date("agreed_deadline"),
    responseDueAt: timestamp("response_due_at", { withTimezone: true }),
    /** First time the client opened this version in the portal. */
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    clientRemindedAt: timestamp("client_reminded_at", { withTimezone: true }),
    expiryWarnedAt: timestamp("expiry_warned_at", { withTimezone: true }),
    /** Offer-level discount; `subtotal` is the taxable base after it. */
    discountType: text("discount_type", { enum: ["percent", "amount"] }),
    discountValue: numeric("discount_value", { precision: 14, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    clientNote: text("client_note"),
    internalNote: text("internal_note"),
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    contentHash: text("content_hash"),
    /** Company logo at the moment of sending; drafts show the current `organizations.logoStoragePath`. */
    logoStoragePath: text("logo_storage_path"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("change_revisions_order_number_uidx").on(
      table.changeOrderId,
      table.revisionNumber,
    ),
    uniqueIndex("change_revisions_order_id_uidx").on(table.changeOrderId, table.id),
    index("change_revisions_order_status_idx").on(
      table.changeOrderId,
      table.status,
    ),
  ],
);

export const changeOrderLineItems = appSchema.table(
  "change_order_line_items",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    revisionId: bigint("revision_id", { mode: "number" })
      .notNull()
      .references(() => changeOrderRevisions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unit: text("unit"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  },
  (table) => [index("change_line_items_revision_idx").on(table.revisionId)],
);

/** Indicative stages of an offer version: a title and a duration, no dates. Frozen with the version. */
export const changeOrderScheduleItems = appSchema.table(
  "change_order_schedule_items",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    revisionId: bigint("revision_id", { mode: "number" })
      .notNull()
      .references(() => changeOrderRevisions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    durationDays: integer("duration_days").notNull(),
    /** Stable across versions of the same offer: a line copied into a new version keeps its key. */
    lineKey: uuid("line_key").notNull().defaultRandom(),
  },
  (table) => [
    uniqueIndex("change_order_schedule_items_revision_id_position_key").on(table.revisionId, table.position),
    uniqueIndex("change_order_schedule_items_line_key_uidx").on(table.revisionId, table.lineKey),
  ],
);

/** When and how much of an offer version's total is due. Frozen with the version; turned into installments on approval. */
export const changeOrderPaymentTerms = appSchema.table(
  "change_order_payment_terms",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    revisionId: bigint("revision_id", { mode: "number" })
      .notNull()
      .references(() => changeOrderRevisions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    percent: numeric("percent", { precision: 5, scale: 2 }).notNull(),
    dueTrigger: text("due_trigger", { enum: ["on_approval", "on_stage", "on_completion", "on_date"] }).notNull(),
    dueOn: date("due_on"),
    scheduleLineKey: uuid("schedule_line_key"),
  },
  (table) => [unique("change_order_payment_terms_revision_id_position_key").on(table.revisionId, table.position)],
);

/** Approved changes that an offer version already includes; on its approval they stop adding to the price. */
export const revisionAbsorbedChanges = appSchema.table(
  "revision_absorbed_changes",
  {
    revisionId: bigint("revision_id", { mode: "number" })
      .notNull()
      .references(() => changeOrderRevisions.id, { onDelete: "cascade" }),
    changeOrderId: uuid("change_order_id")
      .notNull()
      .references(() => changeOrders.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.revisionId, table.changeOrderId] }),
    index("revision_absorbed_changes_change_idx").on(table.changeOrderId),
  ],
);

export const changeAttachments = appSchema.table(
  "change_attachments",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    changeOrderId: uuid("change_order_id")
      .notNull()
      .references(() => changeOrders.id, { onDelete: "restrict" }),
    revisionId: bigint("revision_id", { mode: "number" }).references(
      () => changeOrderRevisions.id,
      { onDelete: "restrict" },
    ),
    storagePath: text("storage_path").notNull(),
    originalName: text("original_name").notNull(),
    kind: attachmentKind("kind").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    visibility: attachmentVisibility("visibility").notNull().default("client"),
    processingStatus: text("processing_status").notNull().default("ready"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("change_attachments_revision_path_uidx").on(table.revisionId, table.storagePath),
    index("change_attachments_change_order_idx").on(table.changeOrderId),
    index("change_attachments_revision_idx").on(table.revisionId),
    index("change_attachments_project_idx").on(table.projectId),
  ],
);

export const portalOtps = appSchema.table(
  "portal_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portalSessionId: bigint("portal_session_id", { mode: "number" })
      .notNull()
      .references(() => portalSessions.id, { onDelete: "cascade" }),
    projectContactId: uuid("project_contact_id")
      .notNull()
      .references(() => projectContacts.id, { onDelete: "cascade" }),
    purpose: text("purpose")
      .$type<"claim" | "email_change" | "decision" | "unlock">()
      .notNull(),
    revisionId: bigint("revision_id", { mode: "number" }).references(
      () => changeOrderRevisions.id,
      { onDelete: "cascade" },
    ),
    decision: changeDecision("decision"),
    email: text("email").notNull(),
    targetEmail: text("target_email"),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdIp: inet("created_ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("portal_otps_contact_created_idx").on(
      table.projectContactId,
      table.createdAt,
    ),
    index("portal_otps_session_idx").on(table.portalSessionId),
    index("portal_otps_revision_idx").on(table.revisionId),
  ],
);

export const portalDecisions = appSchema.table(
  "portal_decisions",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    revisionId: bigint("revision_id", { mode: "number" })
      .notNull()
      .references(() => changeOrderRevisions.id, { onDelete: "restrict" }),
    projectContactId: uuid("project_contact_id")
      .notNull()
      .references(() => projectContacts.id, { onDelete: "restrict" }),
    portalSessionId: bigint("portal_session_id", { mode: "number" })
      .notNull()
      .references(() => portalSessions.id, { onDelete: "restrict" }),
    decision: changeDecision("decision").notNull(),
    comment: text("comment"),
    typedName: text("typed_name").notNull(),
    consentTextVersion: text("consent_text_version").notNull(),
    revisionContentHash: text("revision_content_hash").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    otpId: uuid("otp_id").references(() => portalOtps.id, {
      onDelete: "restrict",
    }),
    verifiedEmail: text("verified_email"),
    signatureStoragePath: text("signature_storage_path"),
    signatureSha256: text("signature_sha256"),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("portal_decisions_idempotency_uidx").on(table.idempotencyKey),
    uniqueIndex("portal_decisions_revision_uidx").on(table.revisionId),
    uniqueIndex("portal_decisions_otp_uidx").on(table.otpId),
    index("portal_decisions_contact_idx").on(table.projectContactId),
    index("portal_decisions_session_idx").on(table.portalSessionId),
  ],
);

export const timelineEvents = appSchema.table(
  "timeline_events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    changeOrderId: uuid("change_order_id").references(() => changeOrders.id, {
      onDelete: "restrict",
    }),
    revisionId: bigint("revision_id", { mode: "number" }).references(
      () => changeOrderRevisions.id,
      { onDelete: "restrict" },
    ),
    actorType: timelineActorType("actor_type").notNull(),
    actorId: text("actor_id"),
    eventType: text("event_type").notNull(),
    visibility: timelineVisibility("visibility").notNull().default("internal"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("timeline_project_cursor_idx").on(
      table.projectId,
      table.createdAt,
      table.id,
    ),
    index("timeline_change_created_idx").on(table.changeOrderId, table.createdAt, table.id),
    index("timeline_client_digest_idx").on(table.createdAt).where(sql`${table.visibility} = 'client' and ${table.actorType} = 'staff'`),
    index("timeline_revision_idx").on(table.revisionId),
  ],
);

export const teamInvites = appSchema.table(
  "team_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    email: text("email").notNull(),
    role: memberRole("role").notNull(),
    permissions: memberPermission("permissions").array().notNull().default([]),
    allProjects: boolean("all_projects").notNull().default(false),
    projectIds: uuid("project_ids").array().notNull().default([]),
    tokenHash: text("token_hash").notNull(),
    createdBy: uuid("created_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("team_invites_token_hash_uidx").on(table.tokenHash),
    index("team_invites_org_email_idx").on(table.organizationId, table.email),
  ],
);

export const ownerRoleRequests = appSchema.table(
  "owner_role_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    targetUserId: uuid("target_user_id").notNull(),
    requestedRole: memberRole("requested_role"),
    /** The target's role when the change was proposed; approval fails when it has changed since. */
    targetRole: memberRole("target_role"),
    removeMember: boolean("remove_member").notNull().default(false),
    requestedBy: uuid("requested_by").notNull(),
    approvedBy: uuid("approved_by"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("owner_role_requests_org_status_idx").on(table.organizationId, table.status)],
);

export const staffNotifications = appSchema.table(
  "staff_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staff_notifications_org_user_created_idx").on(table.organizationId, table.userId, table.createdAt.desc()),
    index("staff_notifications_org_user_unread_idx").on(table.organizationId, table.userId).where(sql`${table.readAt} is null`),
  ],
);

export const projectMilestones = appSchema.table(
  "project_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    changeOrderId: uuid("change_order_id").references(() => changeOrders.id),
    /** The base offer this stage belongs to; null means the project as a whole. */
    offerId: uuid("offer_id"),
    /** The offer schedule line this stage was created from, if any. */
    scheduleItemId: bigint("schedule_item_id", { mode: "number" }).references(() => changeOrderScheduleItems.id, { onDelete: "set null" }),
    /** Same line in any version of the offer (see `changeOrderScheduleItems.lineKey`). */
    scheduleLineKey: uuid("schedule_line_key"),
    title: text("title").notNull(),
    dueOn: date("due_on").notNull(),
    /** The date before the last move, shown to the client with the reason. */
    previousDueOn: date("previous_due_on"),
    dueChangeReason: text("due_change_reason"),
    status: text("status").notNull().default("planned"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    ...timestamps,
  },
  (table) => [
    index("project_milestones_project_due_idx").on(table.projectId, table.dueOn),
    index("project_milestones_project_offer_idx").on(table.projectId, table.offerId),
    index("project_milestones_change_order_idx").on(table.changeOrderId).where(sql`${table.changeOrderId} is not null`),
    foreignKey({ columns: [table.projectId, table.offerId], foreignColumns: [changeOrders.projectId, changeOrders.id], name: "project_milestones_offer_fk" }),
    index("project_milestones_org_open_due_idx").on(table.organizationId, table.dueOn).where(sql`${table.status} <> 'completed'`),
  ],
);

export const paymentInstallments = appSchema.table(
  "payment_installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    offerId: uuid("offer_id"),
    /** The payment term of the approved offer version this installment was generated from. */
    termId: bigint("term_id", { mode: "number" }).references(() => changeOrderPaymentTerms.id, { onDelete: "set null" }),
    milestoneId: uuid("milestone_id").references(() => projectMilestones.id),
    kind: paymentKind("kind").notNull(),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    dueOn: date("due_on").notNull(),
    createdBy: uuid("created_by").notNull(),
    ...timestamps,
  },
  (table) => [
    index("payment_installments_project_due_idx").on(table.projectId, table.dueOn),
    index("payment_installments_project_offer_idx").on(table.projectId, table.offerId),
    index("payment_installments_milestone_idx").on(table.milestoneId).where(sql`${table.milestoneId} is not null`),
    foreignKey({ columns: [table.projectId, table.offerId], foreignColumns: [changeOrders.projectId, changeOrders.id], name: "payment_installments_offer_fk" }),
  ],
);

export const projectReceipts = appSchema.table(
  "project_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    /** Null: not assigned to an offer yet. Can be set once; the row is otherwise append-only. */
    offerId: uuid("offer_id"),
    installmentId: uuid("installment_id").references(() => paymentInstallments.id),
    correctionOfId: uuid("correction_of_id"),
    kind: paymentKind("kind").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    method: text("method").notNull(),
    receivedOn: date("received_on").notNull(),
    note: text("note"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_receipts_org_date_idx").on(table.organizationId, table.receivedOn),
    index("project_receipts_project_date_idx").on(table.projectId, table.receivedOn),
    index("project_receipts_project_offer_idx").on(table.projectId, table.offerId),
    index("project_receipts_installment_idx").on(table.installmentId).where(sql`${table.installmentId} is not null`),
    foreignKey({ columns: [table.projectId, table.offerId], foreignColumns: [changeOrders.projectId, changeOrders.id], name: "project_receipts_offer_fk" }),
  ],
);

export const paymentDisputes = appSchema.table(
  "payment_disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    receiptId: uuid("receipt_id").notNull().references(() => projectReceipts.id),
    projectContactId: uuid("project_contact_id").notNull().references(() => projectContacts.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    resolution: text("resolution"),
    resolvedBy: uuid("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_disputes_project_status_idx").on(table.projectId, table.status),
    uniqueIndex("payment_disputes_one_open_uidx").on(table.receiptId).where(sql`${table.status} = 'open'`),
  ],
);

/** "I paid" from the client; the company confirms it (recording a receipt) or rejects it with a reason. */
export const paymentClaims = appSchema.table(
  "payment_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    offerId: uuid("offer_id"),
    installmentId: uuid("installment_id").references(() => paymentInstallments.id),
    projectContactId: uuid("project_contact_id").notNull().references(() => projectContacts.id),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    method: text("method", { enum: ["cash", "bank", "card", "other"] }).notNull(),
    paidOn: date("paid_on").notNull(),
    note: text("note"),
    status: text("status", { enum: ["pending", "confirmed", "rejected"] }).notNull().default("pending"),
    response: text("response"),
    receiptId: uuid("receipt_id").references(() => projectReceipts.id),
    resolvedBy: uuid("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_claims_project_status_idx").on(table.projectId, table.status),
    index("payment_claims_installment_idx").on(table.installmentId).where(sql`${table.installmentId} is not null`),
    foreignKey({ columns: [table.projectId, table.offerId], foreignColumns: [changeOrders.projectId, changeOrders.id] }),
  ],
);

/** Handover of one offer's work: requested by the company, accepted or answered with issues by the client. Append-only. */
export const offerAcceptances = appSchema.table(
  "offer_acceptances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    offerId: uuid("offer_id").notNull(),
    kind: text("kind", { enum: ["requested", "accepted", "issues"] }).notNull(),
    note: text("note"),
    typedName: text("typed_name"),
    actorType: text("actor_type", { enum: ["staff", "portal_contact"] }).notNull(),
    actorId: uuid("actor_id").notNull(),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("offer_acceptances_offer_idx").on(table.offerId, table.createdAt),
    index("offer_acceptances_project_idx").on(table.projectId, table.createdAt),
    foreignKey({ columns: [table.projectId, table.offerId], foreignColumns: [changeOrders.projectId, changeOrders.id] }),
  ],
);

export const internalNotes = appSchema.table(
  "internal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    changeOrderId: uuid("change_order_id").references(() => changeOrders.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("internal_notes_project_idx").on(table.projectId, table.createdAt.desc()),
    index("internal_notes_change_order_idx").on(table.changeOrderId, table.createdAt.desc()),
  ],
);

export const documentMessages = appSchema.table(
  "document_messages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    /** Every message is about one offer or change (docs/chat-narrowing-plan.md). */
    changeOrderId: uuid("change_order_id").notNull().references(() => changeOrders.id, { onDelete: "cascade" }),
    revisionId: bigint("revision_id", { mode: "number" }).references(() => changeOrderRevisions.id, { onDelete: "set null" }),
    authorType: text("author_type", { enum: ["staff", "portal_contact"] }).notNull(),
    authorId: uuid("author_id").notNull(),
    body: text("body").notNull(),
    readByStaffAt: timestamp("read_by_staff_at", { withTimezone: true }),
    readByClientAt: timestamp("read_by_client_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("document_messages_change_order_idx").on(table.changeOrderId, table.createdAt),
  ],
);

export const notificationPreferences = appSchema.table(
  "notification_preferences",
  {
    userId: uuid("user_id").notNull(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    email: boolean("email").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.organizationId, table.eventType] })],
);

export const catalogItems = appSchema.table(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    category: text("category"),
    createdBy: uuid("created_by").notNull(),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [index("catalog_items_org_name_idx").on(table.organizationId, sql`lower(${table.name})`)],
);

export type TemplateLine = { description: string; quantity: number; unit: string; unitPrice: number };

export const offerTemplates = appSchema.table(
  "offer_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    clientNote: text("client_note"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull(),
    lines: jsonb("lines").$type<TemplateLine[]>().notNull().default([]),
    createdBy: uuid("created_by").notNull(),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [index("offer_templates_org_idx").on(table.organizationId, table.createdAt.desc())],
);
