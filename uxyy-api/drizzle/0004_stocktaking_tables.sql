CREATE TABLE "stocktaking_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"book_qty" numeric(12, 2) NOT NULL,
	"actual_qty" numeric(12, 2),
	"diff_qty" numeric(12, 2),
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "stocktaking_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"warehouse_id" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"remark" text,
	"created_by" integer NOT NULL,
	"confirmed_by" integer,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stocktaking_items" ADD CONSTRAINT "stocktaking_items_order_id_stocktaking_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."stocktaking_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_items" ADD CONSTRAINT "stocktaking_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stocktaking_items_order_idx" ON "stocktaking_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stocktaking_items_product_idx" ON "stocktaking_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stocktaking_orders_enterprise_idx" ON "stocktaking_orders" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "stocktaking_orders_status_idx" ON "stocktaking_orders" USING btree ("enterprise_id","status");