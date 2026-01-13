import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    name: String,
    subject: String,
    message: String,
    status: String,
    retries: Number
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", MessageSchema);
