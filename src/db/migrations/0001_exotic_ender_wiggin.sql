CREATE TABLE "admin_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"tripId" text,
	"userName" text NOT NULL,
	"location" text NOT NULL,
	"coordinates" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolvedBy" text,
	"resolvedAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_penalty_job" (
	"id" text PRIMARY KEY NOT NULL,
	"fileName" text NOT NULL,
	"filePath" text NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"totalRows" integer DEFAULT 0 NOT NULL,
	"processedRows" integer DEFAULT 0 NOT NULL,
	"affectedDrivers" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_profile" (
	"userId" text PRIMARY KEY NOT NULL,
	"plateNumber" text NOT NULL,
	"vehicleModel" text NOT NULL,
	"capacity" integer DEFAULT 3 NOT NULL,
	"licenseNumber" text NOT NULL,
	"serviceScore" integer DEFAULT 0 NOT NULL,
	"tripsCompleted" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "driver_profile_plateNumber_unique" UNIQUE("plateNumber")
);
--> statement-breakpoint
ALTER TABLE "admin_alert" ADD CONSTRAINT "admin_alert_tripId_ride_request_id_fk" FOREIGN KEY ("tripId") REFERENCES "public"."ride_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_alert" ADD CONSTRAINT "admin_alert_resolvedBy_admin_user_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."admin_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_penalty_job" ADD CONSTRAINT "admin_penalty_job_createdBy_admin_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profile" ADD CONSTRAINT "driver_profile_userId_driver_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."driver_user"("id") ON DELETE cascade ON UPDATE no action;