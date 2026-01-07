import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql', // 'driver' is deprecated/replaced often
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
} satisfies Config;
