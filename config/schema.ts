import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Schema placeholder untuk tabel users
export const users_table = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Schema placeholder untuk tabel transactions
export const transactions_table = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users_table.id).notNull(),
  amount: text('amount').notNull(),
  status: text('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
