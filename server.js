import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { executeStatement } from "./db.js";

dotenv.config();

const app = express();
// Allow Vercel (and previews): comma-separated origins, or any origin if unset
const corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

/* =========================
   GET STUDENTS (FIXED)
========================= */
app.get("/students", (req, res) => {
  let {
    search = "",
    page = 1,
    limit = 5,
    sortBy = "ID",
    order = "ASC",
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  const offset = (page - 1) * limit;

  let query = `
    SELECT s.id AS ID, s.name AS NAME, m.marks AS MARKS
    FROM students s
    JOIN marks m ON s.id = m.student_id
    WHERE 1=1
  `;

  let binds = [];

  /* =========================
     🔍 SEARCH
  ========================= */
  if (search) {
    query += ` AND LOWER(s.name) LIKE ?`;
    binds.push(`%${search.toLowerCase()}%`);
  }

  /* =========================
     🔄 SORT
  ========================= */
  const allowedSort = ["ID", "NAME", "MARKS"];
  const allowedOrder = ["ASC", "DESC"];

  if (!allowedSort.includes(sortBy.toUpperCase())) {
    sortBy = "ID";
  }

  if (!allowedOrder.includes(order.toUpperCase())) {
    order = "ASC";
  }

  query += ` ORDER BY ${sortBy} ${order}`;

  /* =========================
     📄 PAGINATION
  ========================= */
  query += ` LIMIT ${limit} OFFSET ${offset}`;

  console.log("QUERY:", query);
  console.log("BINDS:", binds);

  executeStatement({
    sqlText: query,
    binds,
    complete: (err, stmt, rows) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      res.json(rows); // ✅ Always return array
    },
  });
});

/* =========================
   ADD STUDENT
========================= */
app.post("/students", (req, res) => {
  const { id, name, marks } = req.body;

  executeStatement({
    sqlText: `INSERT INTO students (id, name) VALUES (?, ?)`,
    binds: [id, name],
    complete: (err) => {
      if (err) return res.status(500).send(err.message);

      executeStatement({
        sqlText: `INSERT INTO marks (student_id, marks) VALUES (?, ?)`,
        binds: [id, marks],
        complete: (err2) => {
          if (err2) return res.status(500).send(err2.message);

          res.send("Student added successfully ✅");
        },
      });
    },
  });
});

/* =========================
   UPDATE STUDENT
========================= */
app.put("/students/:id", (req, res) => {
  const id = req.params.id;
  const { name, marks } = req.body;

  executeStatement({
    sqlText: `UPDATE students SET name=? WHERE id=?`,
    binds: [name, id],
    complete: (err) => {
      if (err) return res.status(500).send(err.message);

      executeStatement({
        sqlText: `UPDATE marks SET marks=? WHERE student_id=?`,
        binds: [marks, id],
        complete: (err2) => {
          if (err2) return res.status(500).send(err2.message);

          res.send("Updated successfully ✅");
        },
      });
    },
  });
});

/* =========================
   DELETE STUDENT
========================= */
app.delete("/students/:id", (req, res) => {
  const id = req.params.id;

  executeStatement({
    sqlText: `DELETE FROM marks WHERE student_id=?`,
    binds: [id],
    complete: (err) => {
      if (err) return res.status(500).send(err.message);

      executeStatement({
        sqlText: `DELETE FROM students WHERE id=?`,
        binds: [id],
        complete: (err2) => {
          if (err2) return res.status(500).send(err2.message);

          res.send("Deleted successfully ✅");
        },
      });
    },
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});