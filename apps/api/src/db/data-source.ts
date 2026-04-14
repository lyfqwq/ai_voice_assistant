import "reflect-metadata";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { DataSource } from "typeorm";

loadEnv({ path: join(process.cwd(), "../../.env") });
loadEnv({ path: join(process.cwd(), "../../.env.local"), override: true });

const appDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [],
  migrations: [join(process.cwd(), "src/db/migrations/*{.ts,.js}")],
});

export default appDataSource;
