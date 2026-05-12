import { getMigrations } from "better-auth/db/migration";
import Database from "better-sqlite3";

const database = new Database("./better-auth.sqlite");

const { runMigrations } = await getMigrations({
  database,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "placeholder",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder",
    },
  },
});

await runMigrations();
console.log("Migration concluída com sucesso!");
process.exit(0);
