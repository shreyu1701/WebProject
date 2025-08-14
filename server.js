/******************************************************************
************
***
* ITE5315 – Project
* I declare that this assignment is my own work in accordance with Humber
Academic Policy.
* No part of this assignment has been copied manually or electronically from any
other source
* (including web sites) or distributed to other students.
*
* Group member Name: _____Group 3______________ Student IDs: _____n01659520 & n01660845__________
Date:
_________13/08/2025___________
*
*
*******************************************************************
***********
**/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const exphbs = require("express-handlebars");
const jwt = require("jsonwebtoken"); // <— added
const db = require("./modules/restaurant_data");

const app = express();
const PORT = process.env.PORT || 8000;
const SECRETKEY = process.env.SECRETKEY || "dev_secret_key"; // <— added

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// handlebars
app.engine(
  "handlebars",
  exphbs.engine({
    defaultLayout: "main",
    helpers: {
      ifEquals(a, b, opts) {
        return a == b ? opts.fn(this) : opts.inverse(this);
      },
      year() {
        return new Date().getFullYear();
      },
      eq: (a, b) => a === b,
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// login (issue JWT)
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });
  const accessToken = jwt.sign({ username }, SECRETKEY, { expiresIn: "1h" });
  res.json({ accessToken });
});

// UI
app.get("/ui/restaurants", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const perPage = Math.min(
      50,
      Math.max(1, parseInt(req.query.perPage || "10", 10))
    );
    const borough = (req.query.borough || "").trim();

    const boroughFilter = borough.length ? borough : null;
    const shouldQuery = !!(req.query.page || req.query.perPage || borough);
    const restaurants = shouldQuery
      ? await db.getAllRestaurants(page, perPage, boroughFilter)
      : [];

    res.render("restaurants", {
      title: "Restaurant Browser",
      page,
      perPage,
      borough,
      boroughs: ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"],
      restaurants,
    });
  } catch (err) {
    res.status(500).render("error", { title: "Error", message: err.message });
  }
});

// API
app.get("/api/restaurants", async (req, res) => {
  try {
    const { page = 1, perPage = 10, borough } = req.query;
    const restaurants = await db.getAllRestaurants(
      parseInt(page, 10),
      parseInt(perPage, 10),
      borough || null
    );
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/restaurants/:id", async (req, res) => {
  try {
    const restaurant = await db.getRestaurantById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: "Not found" });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/restaurants", async (req, res) => {
  try {
    const newRestaurant = await db.addNewRestaurant(req.body);
    res.status(201).json(newRestaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/restaurants/:id", async (req, res) => {
  try {
    const updated = await db.updateRestaurantById(req.body, req.params.id);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/restaurants/:id", async (req, res) => {
  try {
    const deleted = await db.deleteRestaurantById(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// start
db.initialize(process.env.MONGODB_URI).then((success) => {
  if (!success) {
    console.error("Failed to connect to MongoDB");
    process.exit(1);
  }
  console.log("Connected to MongoDB");
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

// --- health (keep this above the export) ---
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- export for Vercel serverless ---
module.exports = app;

// --- local development only (do not run on Vercel) ---
if (!process.env.VERCEL) {
  (async () => {
    try {
      const ok = await db.initialize(process.env.MONGODB_URI);
      if (!ok) throw new Error("Failed to connect to MongoDB");
      console.log("Connected to MongoDB");
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  })();
}
module.exports = app;

if (!process.env.VERCEL) {
  (async () => {
    const ok = await db.initialize(process.env.MONGODB_URI);
    if (!ok) process.exit(1);
    app.listen(process.env.PORT || 8000, () =>
      console.log(`Server running on port ${process.env.PORT || 8000}`)
    );
  })();
}
