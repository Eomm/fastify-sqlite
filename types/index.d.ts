import type { FastifyPluginAsync } from "fastify";
import { sqlite3 } from "sqlite3";
import { Database } from "sqlite";

declare module "fastify" {
  interface FastifyInstance {
    sqlite: Database & { [name: string]: Database };
  }
}

type FastifySqlite = FastifyPluginAsync<fastifySqlite.FastifySqliteOptions>;

declare namespace fastifySqlite {
  export interface FastifySqliteOptions {
    /**
     * Enable Promise API
     * @default false
     */
    promiseApi?: boolean;
    /**
     * Optional decorator name
     * @default null
     */
    name?: string;
    /**
     * Log sqlite3 queries as trace
     * @default false
     */
    verbose?: boolean;
    /**
     * Select the database file
     * @default ':memory:'
     */
    dbFile?: string;
    /**
     * How to connect to the DB
     * @default OPEN_READWRITE | OPEN_CREATE | OPEN_FULLMUTEX
     */
    mode?: number;
  }

  export const sqlite3: sqlite3;
  export const fastifySqlite: FastifySqlite;
  export { fastifySqlite as default };
}

declare function fastifySqlite(
  ...params: Parameters<FastifySqlite>
): ReturnType<FastifySqlite>;
export = fastifySqlite;
