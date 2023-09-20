const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { DateTime } = require("luxon");

// Creating Schema for author
const authorSchema = new Schema({
  first_name: { type: String, required: true, maxLength: 100 },
  family_name: { type: String, required: true, maxLength: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

// Creating virtual's for authors full name:
// Virtual is derived property
authorSchema.virtual("name").get(function () {
  // here it is important we don't use arrow function because we need this binding
  let fullname = "";
  if (this.first_name && this.family_name) {
    fullname = `${this.family_name}, ${this.first_name}`;
  }
  return fullname;
});
// So now name gets added as a property
// now if we do doc.name -> we will get the full name, it will not be a call

// Virtual for author's url
authorSchema.virtual("url").get(function () {
  return `/catalog/author/${this._id}`;
});

authorSchema.virtual("date_of_birth_yyyy_mm_dd").get(function () {
  return DateTime.fromJSDate(this.date_of_birth).toISODate();
});

authorSchema.virtual("date_of_death_yyyy_mm_dd").get(function () {
  return DateTime.fromJSDate(this.date_of_birth).toISODate();
});

authorSchema.virtual("lifeSpan").get(function () {
  const birth_date = this.date_of_birth
    ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED)
    : "Birth unknown";
  const death_date = this.date_of_death
    ? DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED)
    : "";
  return `(${birth_date} - ${death_date})`;
});

//finally Export the model
// Schema----compiles----->model----instantiated--->document

module.exports = mongoose.model("Author", authorSchema);
