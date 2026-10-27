CREATE TYPE "public"."room_category" AS ENUM('Classroom', 'Computer Lab', 'Offices', 'Lecture hall/Auditorium', 'CAD Workstation');--> statement-breakpoint
CREATE TABLE "device_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"received_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lighting_modules" (
	"device_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"last_received_at" timestamp (3) with time zone,
	CONSTRAINT "lighting_modules_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"category" "room_category" NOT NULL,
	"target_lux" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone,
	CONSTRAINT "room_target" CHECK ("rooms"."target_lux" = CASE WHEN "rooms"."category" IN ('Computer Lab','Offices') THEN 300 ELSE 500 END)
);
--> statement-breakpoint
CREATE TABLE "samples" (
	"id" text PRIMARY KEY NOT NULL,
	"sample_id" text NOT NULL,
	"session_id" text NOT NULL,
	"device_id" text NOT NULL,
	"sampled_at" timestamp (3) with time zone NOT NULL,
	"received_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"uptime_ms" double precision NOT NULL,
	"sensor1_lux" double precision,
	"sensor2_lux" double precision,
	"sensor3_lux" double precision,
	"average_lux" double precision,
	"assessment" text,
	"quality" text NOT NULL,
	"payload" text NOT NULL,
	CONSTRAINT "lux_0_bounds" CHECK ("samples"."sensor1_lux" IS NULL OR ("samples"."sensor1_lux" >= 0 AND "samples"."sensor1_lux" <= 65535)),
	CONSTRAINT "lux_1_bounds" CHECK ("samples"."sensor2_lux" IS NULL OR ("samples"."sensor2_lux" >= 0 AND "samples"."sensor2_lux" <= 65535)),
	CONSTRAINT "lux_2_bounds" CHECK ("samples"."sensor3_lux" IS NULL OR ("samples"."sensor3_lux" >= 0 AND "samples"."sensor3_lux" <= 65535)),
	CONSTRAINT "uptime_bounds" CHECK ("samples"."uptime_ms" >= 0 AND "samples"."uptime_ms" <= 4294967295 AND "samples"."uptime_ms" = floor("samples"."uptime_ms"))
);
--> statement-breakpoint
CREATE TABLE "measurement_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"room_id" text NOT NULL,
	"module_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"start_inputs" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp (3) with time zone,
	"room_snapshot" jsonb NOT NULL,
	"module_snapshot" jsonb NOT NULL,
	"placement_notes" text,
	"summary" jsonb,
	CONSTRAINT "session_state" CHECK (("measurement_sessions"."status" = 'active' AND "measurement_sessions"."stopped_at" IS NULL AND "measurement_sessions"."summary" IS NULL) OR ("measurement_sessions"."status" = 'completed' AND "measurement_sessions"."stopped_at" IS NOT NULL AND "measurement_sessions"."summary" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "email_normalized" CHECK ("users"."email" = lower(trim("users"."email")))
);
--> statement-breakpoint
ALTER TABLE "device_requests" ADD CONSTRAINT "device_requests_device_id_lighting_modules_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."lighting_modules"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lighting_modules" ADD CONSTRAINT "lighting_modules_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_session_id_measurement_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."measurement_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_device_id_lighting_modules_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."lighting_modules"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_sessions" ADD CONSTRAINT "measurement_sessions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_sessions" ADD CONSTRAINT "measurement_sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_sessions" ADD CONSTRAINT "measurement_sessions_module_id_lighting_modules_device_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."lighting_modules"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_rate" ON "device_requests" USING btree ("device_id","received_at");--> statement-breakpoint
CREATE INDEX "modules_owner" ON "lighting_modules" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "rooms_owner" ON "rooms" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sample_replay_key" ON "samples" USING btree ("device_id","sample_id");--> statement-breakpoint
CREATE INDEX "sample_history" ON "samples" USING btree ("session_id","received_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_start_key" ON "measurement_sessions" USING btree ("owner_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "active_room" ON "measurement_sessions" USING btree ("room_id") WHERE "measurement_sessions"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "active_module" ON "measurement_sessions" USING btree ("module_id") WHERE "measurement_sessions"."status" = 'active';