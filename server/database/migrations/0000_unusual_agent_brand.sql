CREATE TABLE `drivers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`rntrc` text NOT NULL,
	`vehicle_model` text NOT NULL,
	`vehicle_plates` text NOT NULL,
	`target_consumption_milli_kml` integer DEFAULT 2350 NOT NULL,
	`max_cost_per_km_cents` integer DEFAULT 510 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drivers_email_unique` ON `drivers` (`email`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`trip_id` integer,
	`expense_date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`fuel_liters_deciliters` integer,
	`payment_method` text NOT NULL,
	`receipt_reference` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "expenses_amount_positive_chk" CHECK("expenses"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE INDEX `expenses_driver_date_idx` ON `expenses` (`driver_id`,`expense_date`);--> statement-breakpoint
CREATE INDEX `expenses_driver_category_date_idx` ON `expenses` (`driver_id`,`category`,`expense_date`);--> statement-breakpoint
CREATE INDEX `expenses_trip_idx` ON `expenses` (`trip_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_driver_idx` ON `password_reset_tokens` (`driver_id`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`trip_date` text NOT NULL,
	`invoice_number` text,
	`origin_city` text NOT NULL,
	`origin_state` text NOT NULL,
	`destination_city` text NOT NULL,
	`destination_state` text NOT NULL,
	`cargo_weight_kg` integer,
	`freight_value_cents` integer DEFAULT 0 NOT NULL,
	`toll_cost_cents` integer DEFAULT 0 NOT NULL,
	`km_start` integer NOT NULL,
	`km_end` integer NOT NULL,
	`distance_km` integer NOT NULL,
	`fuel_liters_deciliters` integer NOT NULL,
	`fuel_cost_cents` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "trips_km_end_gt_start_chk" CHECK("trips"."km_end" > "trips"."km_start"),
	CONSTRAINT "trips_distance_positive_chk" CHECK("trips"."distance_km" > 0),
	CONSTRAINT "trips_fuel_liters_positive_chk" CHECK("trips"."fuel_liters_deciliters" > 0)
);
--> statement-breakpoint
CREATE INDEX `trips_driver_date_idx` ON `trips` (`driver_id`,`trip_date`);--> statement-breakpoint
CREATE INDEX `trips_origin_state_idx` ON `trips` (`driver_id`,`origin_state`);--> statement-breakpoint
CREATE INDEX `trips_dest_state_idx` ON `trips` (`driver_id`,`destination_state`);