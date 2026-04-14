import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export function createTypeOrmOptions(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: "postgres",
    url: configService.getOrThrow<string>("databaseUrl"),
    synchronize: false,
    autoLoadEntities: false,
    migrationsRun: false,
    logging: false,
    entities: [],
    migrations: [join(process.cwd(), "src/db/migrations/*{.ts,.js}")],
  };
}

