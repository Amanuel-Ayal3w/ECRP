CREATE TABLE "admin_account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "admin_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "admin_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "admin_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admin_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "driver_account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_availability" (
	"userId" text PRIMARY KEY NOT NULL,
	"isOnline" boolean DEFAULT false NOT NULL,
	"routeStart" text,
	"routeEnd" text,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_document" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"docType" text NOT NULL,
	"originalName" text NOT NULL,
	"filePath" text NOT NULL,
	"mimeType" text NOT NULL,
	"fileSize" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"uploadedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "driver_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "driver_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "driver_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "driver_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "passenger_account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passenger_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "passenger_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "passenger_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "passenger_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "passenger_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "ride_rejection" (
	"id" text PRIMARY KEY NOT NULL,
	"rideId" text NOT NULL,
	"driverId" text NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_request" (
	"id" text PRIMARY KEY NOT NULL,
	"passengerId" text NOT NULL,
	"pickup" text NOT NULL,
	"destination" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"matchedDriverId" text,
	"acceptedAt" timestamp,
	"startedAt" timestamp,
	"endedAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_account" ADD CONSTRAINT "admin_account_userId_admin_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_userId_admin_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_account" ADD CONSTRAINT "driver_account_userId_driver_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."driver_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_availability" ADD CONSTRAINT "driver_availability_userId_driver_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."driver_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_document" ADD CONSTRAINT "driver_document_userId_driver_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."driver_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_session" ADD CONSTRAINT "driver_session_userId_driver_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."driver_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passenger_account" ADD CONSTRAINT "passenger_account_userId_passenger_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."passenger_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passenger_session" ADD CONSTRAINT "passenger_session_userId_passenger_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."passenger_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_rejection" ADD CONSTRAINT "ride_rejection_rideId_ride_request_id_fk" FOREIGN KEY ("rideId") REFERENCES "public"."ride_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_rejection" ADD CONSTRAINT "ride_rejection_driverId_driver_user_id_fk" FOREIGN KEY ("driverId") REFERENCES "public"."driver_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_request" ADD CONSTRAINT "ride_request_passengerId_passenger_user_id_fk" FOREIGN KEY ("passengerId") REFERENCES "public"."passenger_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_request" ADD CONSTRAINT "ride_request_matchedDriverId_driver_user_id_fk" FOREIGN KEY ("matchedDriverId") REFERENCES "public"."driver_user"("id") ON DELETE set null ON UPDATE no action;