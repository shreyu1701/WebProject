// modules/restaurantDB.js
const mongoose = require("mongoose");

let conn = null; // connection handle
let Restaurant = null; // model bound to the above connection

// ----- Schema -----
const restaurantSchema = new mongoose.Schema(
  {
    address: {
      building: { type: String, trim: true },
      coord: { type: [Number], index: "2d" }, // optional geo index
      street: { type: String, trim: true },
      zipcode: { type: String, trim: true },
    },
    borough: { type: String, index: true },
    cuisine: { type: String, trim: true },
    grades: [
      {
        date: { type: Date },
        grade: { type: String, trim: true },
        score: { type: Number, min: 0 },
      },
    ],
    name: { type: String, required: true, index: true },
    restaurant_id: { type: String, index: true },
  },
  { timestamps: true }
);

// Optional compound/text indexes for faster queries
restaurantSchema.index({ borough: 1, cuisine: 1 });
restaurantSchema.index({ name: "text", cuisine: "text" });

// ----- Init / Connection -----
async function initialize(connectionString) {
  try {
    conn = await mongoose.createConnection(connectionString).asPromise();
    Restaurant = conn.model("Restaurant", restaurantSchema, "restaurants"); // force collection name
    const dbName = conn.name;
    const count = await Restaurant.estimatedDocumentCount();
    console.log(
      `✅ Mongo connected to DB "${dbName}". restaurants count=${count}`
    );
    return true;
  } catch (err) {
    console.error("❌ Mongo connection failed:", err.message);
    return false;
  }
}

function assertReady() {
  if (!conn || conn.readyState !== 1 || !Restaurant) {
    throw new Error("Database not initialized");
  }
}

// ----- CRUD -----
async function addNewRestaurant(data) {
  assertReady();
  const doc = new Restaurant(data);
  await doc.save();
  return doc.toObject();
}

async function getAllRestaurants(page = 1, perPage = 10, borough = null) {
  assertReady();
  const filter = borough ? { borough } : {};
  const skip = Math.max(0, (Number(page) - 1) * Number(perPage));
  const limit = Math.max(1, Number(perPage));

  return Restaurant.find(filter)
    .sort({ _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}

async function getRestaurantById(id) {
  assertReady();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Restaurant.findById(id).lean().exec();
}

async function updateRestaurantById(data, id) {
  assertReady();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Restaurant.findByIdAndUpdate(id, data, {
    new: true,
    lean: true,
  }).exec();
}

async function deleteRestaurantById(id) {
  assertReady();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const res = await Restaurant.findByIdAndDelete(id).lean().exec();
  if (!res) return null;
  return { message: "Restaurant deleted successfully" };
}

module.exports = {
  initialize,
  addNewRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurantById,
  deleteRestaurantById,
};
