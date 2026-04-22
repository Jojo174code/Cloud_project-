import { defineConfig } from '@prisma/cli';

export default defineConfig({
  datasource: {
    db: {
      provider: 'sqlite',
      // Use DATABASE_URL env var if set, otherwise default to a local file
      url: process.env.DATABASE_URL ?? 'file:../dev.db',
    },
  },
});
