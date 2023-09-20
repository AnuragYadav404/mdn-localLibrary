const BookInstance = require("../models/bookinstance");
const asyncHandler = require("express-async-handler");
const Mongoose = require("mongoose");
const Book = require("../models/book");
const { body, validationResult } = require("express-validator");

// For display list of bookinstances
exports.bookinstance_list = asyncHandler(async function (req, res, next) {
  const allBookInstances = await BookInstance.find()
    .populate("book")
    .sort({ status: 1 })
    .exec();
  // res.send(allBookInstances);
  res.render("bookinstance_list", {
    title: "Book Instance List",
    bookinstance_list: allBookInstances,
  });
  // res.send("Not Implemented: bookinstance's List");
});

// For display for a particular bookinstance
exports.bookinstance_detail = asyncHandler(async function (req, res, next) {
  if (!Mongoose.isValidObjectId(req.params.id)) {
    const err = new Error("Invalid book instance Search");
    err.status = 400;
    return next(err);
  }
  const bookinstanceinfo = await BookInstance.findById(req.params.id)
    .populate("book")
    .exec();
  if (bookinstanceinfo == null) {
    const err = new Error("Bookinstance not found");
    err.status(404);
    next(err);
  }
  res.render("bookinstance_detail", {
    bookinstanceinfo,
  });
  // res.send(`Not implemented bookinstance detail: ${req.params.id}`);
});

// Display bookinstance create form GET
exports.bookinstance_create_get = asyncHandler(async function (req, res, next) {
  // need to display out all the possible books
  const books = await Book.find().exec();
  res.render("bookinstance_form", {
    title: "Create book instance",
    book_list: books,
    stops: ["Available", "Maintenance", "Loaned", "Reserved"],
  });
  // res.send("Not implemented: bookinstance create GET");
});

// handle bookinstance create POST
exports.bookinstance_create_post = [
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid Date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  asyncHandler(async function (req, res, next) {
    const errors = validationResult(req);

    const bookInstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      const books = await Book.find().exec();

      res.render("bookinstance_form", {
        title: "Create book instance",
        book_list: books,
        selected_book: req.body.book.toString(),
        lastStatus: req.body.status,
        errors: errors.array(),
        bookinstance: bookInstance,
        stops: ["Available", "Maintenance", "Loaned", "Reserved"],
      });

      return;
    } else {
      await bookInstance.save();
      return res.redirect(bookInstance.url);
    }
  }),
];

// handle bookinstance delete form on GET
exports.bookinstance_delete_get = asyncHandler(async function (req, res, next) {
  // here in schema nohing refernces bookInstance, it can be deleted easily
  const bookInstance = await BookInstance.findById(req.params.id)
    .populate("book")
    .exec();
  if (bookInstance == null) {
    res.redirect("/catalog/bookinstances");
  }
  res.render("delete_bookinstance", {
    title: "Delete book instance",
    bookInstance,
  });
});

// handle bookinstance delete form on POST
exports.bookinstance_delete_post = asyncHandler(async function (
  req,
  res,
  next
) {
  const bookinstance = await BookInstance.findById(req.params.id);
  if (bookinstance == null) {
    return res.redirect("/catalog/bookinstances");
  }
  await BookInstance.findByIdAndRemove(req.params.id);
  return res.redirect("/catalog/bookinstances");
});

// handle bookinstance update form on GET
exports.bookinstance_update_get = asyncHandler(async function (req, res, next) {
  // book instance uses reference to a book and need to preserve book_id and _id
  const bookinstance = await BookInstance.findById(req.params.id)
    .populate("book")
    .exec();
  const books = await Book.find().exec();
  if (bookinstance === null) {
    const err = new Error("Book instance not found.");
    err.status = 404;
    return next(err);
  }
  // return res.send(bookinstance);
  res.render("bookinstance_form", {
    title: "Update book instance",
    bookinstance,
    selected_book: bookinstance.book._id.toString(),
    stops: ["Available", "Maintenance", "Loaned", "Reserved"],
    lastStatus: bookinstance.status,
    book_list: books,
  });
});

// handle bookinstance update form on POST
exports.bookinstance_update_post = [
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid Date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  asyncHandler(async function (req, res, next) {
    const errors = validationResult(req);

    const bookInstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      const books = await Book.find().exec();

      res.render("bookinstance_form", {
        title: "Update book instance",
        book_list: books,
        selected_book: req.body.book.toString(),
        lastStatus: req.body.status,
        errors: errors.array(),
        bookinstance: bookInstance,
        stops: ["Available", "Maintenance", "Loaned", "Reserved"],
      });
      return;
    } else {
      const updatedBookInstance = await BookInstance.findByIdAndUpdate(
        req.params.id,
        bookInstance,
        {}
      );
      return res.redirect(updatedBookInstance.url);
    }
  }),
];
