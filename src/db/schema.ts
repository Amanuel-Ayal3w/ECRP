import {
  bigint,
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN auth tables  (cookie prefix: ba-admin)
// ─────────────────────────────────────────────────────────────────────────────

export const adminUser = pgTable("admin_user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image:         text("image"),
  /** admin | super_admin */
  role:          text("role").notNull().default("admin"),
  createdAt:     timestamp("createdAt").notNull(),
  updatedAt:     timestamp("updatedAt").notNull(),
});

export const adminSession = pgTable("admin_session", {
  id:        text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token:     text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId:    text("userId").notNull().references(() => adminUser.id, { onDelete: "cascade" }),
});

export const adminAccount = pgTable("admin_account", {
  id:                    text("id").primaryKey(),
  accountId:             text("accountId").notNull(),
  providerId:            text("providerId").notNull(),
  userId:                text("userId").notNull().references(() => adminUser.id, { onDelete: "cascade" }),
  accessToken:           text("accessToken"),
  refreshToken:          text("refreshToken"),
  idToken:               text("idToken"),
  accessTokenExpiresAt:  timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope:                 text("scope"),
  password:              text("password"),
  createdAt:             timestamp("createdAt").notNull(),
  updatedAt:             timestamp("updatedAt").notNull(),
});

export const adminVerification = pgTable("admin_verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expiresAt").notNull(),
  createdAt:  timestamp("createdAt"),
  updatedAt:  timestamp("updatedAt"),
});

// ─────────────────────────────────────────────────────────────────────────────
// PASSENGER auth tables  (cookie prefix: ba-passenger)
// ─────────────────────────────────────────────────────────────────────────────

export const passengerUser = pgTable("passenger_user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image:         text("image"),
  createdAt:     timestamp("createdAt").notNull(),
  updatedAt:     timestamp("updatedAt").notNull(),
});

export const passengerSession = pgTable("passenger_session", {
  id:        text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token:     text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId:    text("userId").notNull().references(() => passengerUser.id, { onDelete: "cascade" }),
});

export const passengerAccount = pgTable("passenger_account", {
  id:                    text("id").primaryKey(),
  accountId:             text("accountId").notNull(),
  providerId:            text("providerId").notNull(),
  userId:                text("userId").notNull().references(() => passengerUser.id, { onDelete: "cascade" }),
  accessToken:           text("accessToken"),
  refreshToken:          text("refreshToken"),
  idToken:               text("idToken"),
  accessTokenExpiresAt:  timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope:                 text("scope"),
  password:              text("password"),
  createdAt:             timestamp("createdAt").notNull(),
  updatedAt:             timestamp("updatedAt").notNull(),
});

export const passengerVerification = pgTable("passenger_verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expiresAt").notNull(),
  createdAt:  timestamp("createdAt"),
  updatedAt:  timestamp("updatedAt"),
});

// ─────────────────────────────────────────────────────────────────────────────
// DRIVER auth tables  (cookie prefix: ba-driver)
// ─────────────────────────────────────────────────────────────────────────────

export const driverUser = pgTable("driver_user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image:         text("image"),
  createdAt:     timestamp("createdAt").notNull(),
  updatedAt:     timestamp("updatedAt").notNull(),
});

export const driverSession = pgTable("driver_session", {
  id:        text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token:     text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId:    text("userId").notNull().references(() => driverUser.id, { onDelete: "cascade" }),
});

export const driverAccount = pgTable("driver_account", {
  id:                    text("id").primaryKey(),
  accountId:             text("accountId").notNull(),
  providerId:            text("providerId").notNull(),
  userId:                text("userId").notNull().references(() => driverUser.id, { onDelete: "cascade" }),
  accessToken:           text("accessToken"),
  refreshToken:          text("refreshToken"),
  idToken:               text("idToken"),
  accessTokenExpiresAt:  timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope:                 text("scope"),
  password:              text("password"),
  createdAt:             timestamp("createdAt").notNull(),
  updatedAt:             timestamp("updatedAt").notNull(),
});

export const driverVerification = pgTable("driver_verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expiresAt").notNull(),
  createdAt:  timestamp("createdAt"),
  updatedAt:  timestamp("updatedAt"),
});

export const driverProfile = pgTable("driver_profile", {
  userId:         text("userId").primaryKey().references(() => driverUser.id, { onDelete: "cascade" }),
  plateNumber:    text("plateNumber").notNull().unique(),
  vehicleModel:   text("vehicleModel").notNull(),
  capacity:       integer("capacity").notNull().default(3),
  licenseNumber:  text("licenseNumber").notNull(),
  serviceScore:   integer("serviceScore").notNull().default(0),
  tripsCompleted: integer("tripsCompleted").notNull().default(0),
  updatedAt:      timestamp("updatedAt").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Ride + Trip core tables
// ─────────────────────────────────────────────────────────────────────────────

export const driverAvailability = pgTable("driver_availability", {
  userId:          text("userId").primaryKey().references(() => driverUser.id, { onDelete: "cascade" }),
  isOnline:        boolean("isOnline").notNull().default(false),
  routeStart:      text("routeStart"),
  routeEnd:        text("routeEnd"),
  routeStartLat:   real("routeStartLat"),
  routeStartLng:   real("routeStartLng"),
  routeEndLat:     real("routeEndLat"),
  routeEndLng:     real("routeEndLng"),
  updatedAt:       timestamp("updatedAt").notNull(),
});

export const rideRequest = pgTable("ride_request", {
  id:              text("id").primaryKey(),
  passengerId:     text("passengerId").notNull().references(() => passengerUser.id, { onDelete: "cascade" }),
  pickup:          text("pickup").notNull(),
  destination:     text("destination").notNull(),
  status:          text("status").notNull().default("requested"),
  matchedDriverId: text("matchedDriverId").references(() => driverUser.id, { onDelete: "set null" }),
  acceptedAt:      timestamp("acceptedAt"),
  startedAt:       timestamp("startedAt"),
  endedAt:         timestamp("endedAt"),
  currentLat:      real("currentLat"),
  currentLng:      real("currentLng"),
  createdAt:       timestamp("createdAt").notNull(),
  updatedAt:       timestamp("updatedAt").notNull(),
});

export const rideRejection = pgTable("ride_rejection", {
  id:         text("id").primaryKey(),
  rideId:     text("rideId").notNull().references(() => rideRequest.id, { onDelete: "cascade" }),
  driverId:   text("driverId").notNull().references(() => driverUser.id, { onDelete: "cascade" }),
  createdAt:  timestamp("createdAt").notNull(),
});

export const adminAlert = pgTable("admin_alert", {
  id:            text("id").primaryKey(),
  tripId:        text("tripId").references(() => rideRequest.id, { onDelete: "set null" }),
  userName:      text("userName").notNull(),
  senderRole:    text("senderRole").$type<"driver" | "passenger">(),
  location:      text("location").notNull(),
  coordinates:   text("coordinates").notNull(),
  severity:      text("severity").notNull().default("medium"),
  resolved:      boolean("resolved").notNull().default(false),
  resolvedBy:    text("resolvedBy").references(() => adminUser.id, { onDelete: "set null" }),
  resolvedAt:    timestamp("resolvedAt"),
  createdAt:     timestamp("createdAt").notNull(),
  updatedAt:     timestamp("updatedAt").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Driver documents  (linked to driver_user)
// ─────────────────────────────────────────────────────────────────────────────

export const driverDocument = pgTable("driver_document", {
  id:           text("id").primaryKey(),
  userId:       text("userId").notNull().references(() => driverUser.id, { onDelete: "cascade" }),
  /** license | registration | insurance */
  docType:      text("docType").notNull(),
  originalName: text("originalName").notNull(),
  filePath:     text("filePath").notNull(),
  mimeType:     text("mimeType").notNull(),
  /** bytes */
  fileSize:     bigint("fileSize", { mode: "number" }).notNull(),
  /** pending | verified | rejected */
  status:            text("status").notNull().default("pending"),
  uploadedAt:        timestamp("uploadedAt").notNull(),
  reviewedByAdminId:   text("reviewedByAdminId").references(() => adminUser.id, { onDelete: "set null" }),
  reviewedByAdminName: text("reviewedByAdminName"),
  reviewedAt:          timestamp("reviewedAt"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Trip event audit log
// ─────────────────────────────────────────────────────────────────────────────

export const tripEvent = pgTable("trip_event", {
  id:        text("id").primaryKey(),
  rideId:    text("rideId").notNull().references(() => rideRequest.id, { onDelete: "cascade" }),
  actorId:   text("actorId").notNull(),
  /** passenger | driver | system */
  actorRole: text("actorRole").notNull(),
  /** match | accept | reject | start | complete | cancel */
  event:     text("event").notNull(),
  /** JSON.stringify'd payload — text not jsonb (no SQL filtering needed) */
  metadata:  text("metadata"),
  createdAt: timestamp("createdAt").notNull(),
});
