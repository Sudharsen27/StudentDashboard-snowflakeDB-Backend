import snowflake from "snowflake-sdk";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
});

connection.connect((err) => {
  if (err) {
    console.error("Unable to connect:", err);
  } else {
    console.log("Connected to Snowflake");
  }
});