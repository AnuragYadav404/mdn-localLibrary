const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookSchema = new Schema({
  title: { type: String, required: true },
  // here we create references i.e set ref:"Author", here Author is our model(doc) or maybe a Author instance?
  author: { type: Schema.Types.ObjectId, ref: "Author", required: true },
  summary: { type: String, required: true },
  isbn: { type: String, required: true },
  // here we create references i.e set ref:"Genre", here Genre is our model(doc) or maybe a Genre instance?
  genre: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
});

// Create a virtual for book url

bookSchema.virtual("url").get(function () {
  return `/catalog/book/${this._id}`;
});

module.exports = mongoose.model("Book", bookSchema);
