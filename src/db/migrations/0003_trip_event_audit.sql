CREATE TABLE "trip_event" (
	"id" text PRIMARY KEY NOT NULL,
	"rideId" text NOT NULL,
	"actorId" text NOT NULL,
	"actorRole" text NOT NULL,
	"event" text NOT NULL,
	"metadata" text,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_event" ADD CONSTRAINT "trip_event_rideId_ride_request_id_fk" FOREIGN KEY ("rideId") REFERENCES "public"."ride_request"("id") ON DELETE cascade ON UPDATE no action;
