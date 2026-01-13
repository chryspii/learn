import mongoose from "mongoose";

export class Mongo {
  static async connect() {
    await mongoose.connect("mongodb://localhost:27017/messages");
    console.log("MongoDB connected");
  }
}
