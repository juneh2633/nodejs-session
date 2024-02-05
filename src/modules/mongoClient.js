const { MongoClient } = require("mongodb");
const mongodbConfig = require("../config/mongodbConfig");

const client = new MongoClient(process.env.DB_MONGO_URI, mongodbConfig);
client.connect();

module.exports = client.db(process.env.DB_MONGO).collection(process.env.DB_MONGO_COLLECTION);
