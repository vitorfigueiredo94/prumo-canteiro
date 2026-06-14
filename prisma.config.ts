import { defineConfig } from "prisma/config";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const dbUrl = `file:${dbPath}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
