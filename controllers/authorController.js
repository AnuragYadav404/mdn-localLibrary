const Author = require("../models/author");
const Book = require("../models/book");
const Mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");

const asyncHandler = require("express-async-handler");

// For display list of authors
exports.author_list = asyncHandler(async function (req, res, next) {
  const allAuthors = await Author.find().exec();
  res.render("author_list", {
    title: "Authors List",
    author_list: allAuthors,
  });
  // res.send("Not Implemented: Author's List");
});

// For display for a particular author
exports.author_detail = asyncHandler(async function (req, res, next) {
  if (!Mongoose.isValidObjectId(req.params.id)) {
    const err = new Error("Invalid Author Search");
    err.status = 400;
    return next(err);
  }
  // res.send(req.params.id);
  // const authorInfo = await Author.findById(req.params.id).exec();
  // const booksInfo = await Book.find({ author: req.params.id }).exec();

  const [authorInfo, booksInfo] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }).exec(),
  ]);
  if (authorInfo === null) {
    // No results.
    const err = new Error("Author not found");
    err.status = 404;
    return next(err);
  }

  res.render("author_detail", {
    authorInfo,
    booksInfo,
  });
  // res.send(`Not implemented author detail: ${req.params.id}`);
});

// Display author create form GET
exports.author_create_get = function (req, res, next) {
  res.render("author_form", {
    title: "Create Author",
  });
  // res.send("Not implemented: Author create GET");
};

// handle author create POST
exports.author_create_post = [
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified")
    .isAlphanumeric() // here we checked for alphanumeric only after escape
    .withMessage("First name contains non-alphanumeric characters"),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified")
    .isAlphanumeric()
    .withMessage("Family name contains non-Alphanumeric characters"),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" }) // here it specifies the empty values will be null or empty strings
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "false" })
    .isISO8601()
    .toDate(),
  asyncHandler(async function (req, res, next) {
    const errors = validationResult(req);
    const authorObj = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });
    if (!errors.isEmpty()) {
      // render the form with the passed in values
      res.render("author_form", {
        title: "Create Author",
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
        errors: errors.array(),
        author: authorObj,
      });
    } else {
      //there are no errors in the request
      //check if author already exists in the model
      const prevAuthor = await Author.findOne({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
      })
        .collation({ locale: "en", strength: 2 })
        .exec();

      if (prevAuthor) {
        res.redirect(prevAuthor.url);
      } else {
        const newAuthor = new Author({
          first_name: req.body.first_name,
          family_name: req.body.family_name,
          date_of_birth: req.body.date_of_birth,
          date_of_death: req.body.date_of_death,
        });
        await newAuthor.save();
        res.redirect(newAuthor.url);
      }
    }
  }),
];

// handle author delete form on GET
exports.author_delete_get = asyncHandler(async function (req, res, next) {
  // display all the books by the author first
  const authorId = req.params.id;
  const [author, booksByAuthor] = await Promise.all([
    Author.findById(authorId).exec(),
    Book.find({ author: authorId }).exec(),
  ]);
  if (author == null) {
    res.redirect("/catalog/authors");
  }
  res.render("delete_author", {
    title: "Delete author",
    author: author,
    author_books: booksByAuthor,
  });
});

// handle author delete form on POST
exports.author_delete_post = asyncHandler(async function (req, res, next) {
  const authorId = req.params.id;
  const [author, booksByAuthor] = await Promise.all([
    Author.findById(authorId).exec(),
    Book.find({ author: authorId }).exec(),
  ]);
  if (author == null) {
    res.redirect("/catalog/authors");
  }
  if (booksByAuthor.length > 0) {
    res.render("delete_author", {
      title: "Delete author",
      author: author,
      author_books: booksByAuthor,
    });
    return;
  } else {
    await Author.findByIdAndRemove(authorId);
    res.redirect("/catalog/authors");
  }
});

// handle author update form on GET
exports.author_update_get = asyncHandler(async function (req, res, next) {
  /*
  const authorSchema = new Schema({
  first_name: { type: String, required: true, maxLength: 100 },
  family_name: { type: String, required: true, maxLength: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});
need to maintain author_id
  */
  const author = await Author.findById(req.params.id).exec();
  if (author === null) {
    const err = new Error("Author not found");
    err.status = 404;
    return next(err);
  }
  res.render("author_form", {
    title: "Update Author",
    first_name: author.first_name,
    family_name: author.family_name,
    date_of_birth: author.date_of_birth,
    date_of_death: author.date_of_death,
    author,
  });
});

// handle author update form on POST
exports.author_update_post = [
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified")
    .isAlphanumeric() // here we checked for alphanumeric only after escape
    .withMessage("First name contains non-alphanumeric characters"),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified")
    .isAlphanumeric()
    .withMessage("Family name contains non-Alphanumeric characters"),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" }) // here it specifies the empty values will be null or empty strings
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "false" })
    .isISO8601()
    .toDate(),
  asyncHandler(async function (req, res, next) {
    const errors = validationResult(req);
    const authorObj = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id: req.params.id,
    });
    if (!errors.isEmpty()) {
      // render the form with the passed in values
      res.render("author_form", {
        title: "Update Author",
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
        errors: errors.array(),
        author: authorObj,
      });
    } else {
      //there are no errors in the request
      //check if author already exists in the model
      const prevAuthor = await Author.findOne({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
      })
        .collation({ locale: "en", strength: 2 })
        .exec();

      if (prevAuthor) {
        res.redirect(prevAuthor.url);
      } else {
        const newAuthor = new Author({
          first_name: req.body.first_name,
          family_name: req.body.family_name,
          date_of_birth: req.body.date_of_birth,
          date_of_death: req.body.date_of_death,
          _id: req.params.id,
        });
        const updatedAuthor = await Author.findByIdAndUpdate(
          req.params.id,
          newAuthor,
          {}
        );
        res.redirect(updatedAuthor.url);
      }
    }
  }),
];
