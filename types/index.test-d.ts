import fastify from "fastify";
import fastifySqlite, { sqlite3 as reExportedSqlite3 } from ".";
import { expectType } from "tsd";
import { sqlite3 } from "sqlite3";
import { Database } from "sqlite";

const app = fastify();

app
  .register(fastifySqlite, {
    dbFile: "foo.db",
    name: "foo",
  })
  .after((err) => {
    app.sqlite;
    expectType<Database & { [name: string]: Database }>(app.sqlite);
    expectType<Database>(app.sqlite.foo);
  });

expectType<sqlite3>(reExportedSqlite3);
