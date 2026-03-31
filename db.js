import snowflake from "snowflake-sdk";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

function connectionOptions() {
  return {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  };
}

let connection = snowflake.createConnection(connectionOptions());

connection.connect((err) => {
  if (err) {
    console.error("Unable to connect:", err);
  } else {
    console.log("Connected to Snowflake");
  }
});

/** Idle timeouts / Render sleep kill the session; this matches those errors. */
function isStaleConnectionError(err) {
  const msg = err && (err.message || String(err));
  if (typeof msg !== "string") return false;
  return (
    /terminated connection/i.test(msg) ||
    /Unable to perform operation using terminated connection/i.test(msg) ||
    /session has expired|Session expired/i.test(msg)
  );
}

function replaceConnection(callback) {
  const previous = connection;
  connection = snowflake.createConnection(connectionOptions());
  try {
    if (typeof previous.destroy === "function") {
      previous.destroy(() => {
        connection.connect(callback);
      });
    } else {
      connection.connect(callback);
    }
  } catch {
    connection.connect(callback);
  }
}

/**
 * Run a statement; on stale session, reconnect once and retry (common on Render free tier).
 */
export function executeStatement({ sqlText, binds, complete }) {
  const run = () => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err && isStaleConnectionError(err)) {
          console.warn("Snowflake session stale; reconnecting and retrying once");
          return replaceConnection((connectErr) => {
            if (connectErr) {
              return complete(connectErr, stmt, rows);
            }
            connection.execute({
              sqlText,
              binds,
              complete: (err2, stmt2, rows2) => complete(err2, stmt2, rows2),
            });
          });
        }
        complete(err, stmt, rows);
      },
    });
  };
  run();
}

/** @deprecated Prefer executeStatement — kept for any direct use */
export { connection };
