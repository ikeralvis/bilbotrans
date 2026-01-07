import { pgTable, text, doublePrecision, timestamp, uuid, unique, json } from 'drizzle-orm/pg-core';

export const stops = pgTable('stops', {
    id: text('id').primaryKey(), // GTFS stop_id
    agency: text('agency').notNull(), // 'metro' | 'bilbobus'
    name: text('name').notNull(),
    lat: doublePrecision('lat'),
    lon: doublePrecision('lon'),
    metadata: json('metadata'), // Store Lines, Platforms, Directions, etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const favorites = pgTable('favorites', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Assuming simple string ID or UUID from auth
    stopId: text('stop_id').notNull(),
    agency: text('agency').notNull(),
    lineId: text('line_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    unq: unique().on(t.userId, t.stopId, t.agency)
}));
