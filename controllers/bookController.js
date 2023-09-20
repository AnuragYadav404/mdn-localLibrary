const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");
const asyncHandler = require("express-async-handler");
const Mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");

//site index/home page
exports.index = asyncHandler(async (req, res, next) => {
  const [
    numBooks,
    numBookInstances,
    numAvailableBookInstances,
    numAuthors,
    numGenres,
  ] = await Promise.all([
    Book.countDocuments({}).exec(),
    BookInstance.countDocuments({}).exec(),
    BookInstance.countDocuments({ status: "Available" }).exec(),
    Author.countDocuments({}).exec(),
    Genre.countDocuments({}).exec(),
  ]);
  res.render("index", {
    title: "Local Library Home",
    book_count: numBooks,
    book_instance_count: numBookInstances,
    book_instance_available_count: numAvailableBookInstances,
    author_count: numAuthors,
    genre_count: numGenres,
  });
});

// For display list of books
exports.book_list = asyncHandler(async function (req, res, next) {
  const allBooks = await Book.find({}, "title author")
    .sort({ title: 1 })
    .populate("author")
    .exec();
  // res.send(allBooks);
  res.render("book_list", { title: "Book List", book_list: allBooks });
});

// For display for a particular book
exports.book_detail = asyncHandler(async function (req, res, next) {
  const bookId = req.params.id;
  if (!Mongoose.isValidObjectId(bookId)) {
    const err = new Error("Invalid Book Search");
    err.status = 400;
    return next(err);
  }
  const [book, bookinstances] = await Promise.all([
    Book.findById(bookId).populate("author").populate("genre").exec(),
    BookInstance.find({ book: bookId }).exec(),
  ]);
  if (book === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }
  // res.send(book);
  res.render("book_detail", { book, bookinstances });
  // res.send(bookInfo);
  // res.send(`Not implemented book detail: ${req.params.id}`);
});

// Display book create form GET
exports.book_create_get = asyncHandler(async function (req, res, next) {
  // here we have to send all the option available of author and the genres
  const [allAuthors, allGenres] = await Promise.all([
    Author.find().exec(),
    Genre.find().exec(),
  ]);
  res.render("book_form", {
    title: "Create Book",
    authors: allAuthors,
    genres: allGenres,
  });
});

// handle book create POST
exports.book_create_post = [
  //converting the genre selections to array
  // if 1 selected -> string, 2 -> array, undefined -> ""
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim() // here have to check
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  asyncHandler(async function (req, res, next) {
    const errors = validationResult(req);
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });
    if (!errors.isEmpty()) {
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().exec(),
        Genre.find().exec(),
      ]);
      // mark selected genres as checked
      for (const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = true;
        }
      }

      res.render("book_form", {
        title: "Create Book",
        authors: allAuthors,
        genres: allGenres,
        book,
        errors: errors.array(),
      });
    } else {
      let copyBook = await Book.findOne({ isbn: book.isbn });
      if (copyBook) {
        res.redirect(copyBook.url);
        return;
      }
      await book.save();
      res.redirect(book.url);
    }
  }),
];

// handle book delete form on GET
exports.book_delete_get = asyncHandler(async function (req, res, next) {
  // book is referenced by book_instances, they must be deleted first
  const [book, bookinstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);
  if (book === null) {
    return res.redirect("/catalog/books");
  }
  res.render("delete_book", {
    title: "Delete book",
    book,
    bookinstances,
  });
  return;
});

// handle book delete form on POST
exports.book_delete_post = asyncHandler(async function (req, res, next) {
  const [book, bookinstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);
  if (book === null) {
    return res.redirect("/catalog/books");
  }
  if (bookinstances.length > 0) {
    res.render("delete_book", {
      title: "Delete book",
      book,
      bookinstances,
    });
    return;
  } else {
    await Book.findByIdAndRemove(req.params.id);
    return res.redirect("/catalog/books");
  }
});

// handle book update form on GET
exports.book_update_get = asyncHandler(async function (req, res, next) {
  // here we will use the same form for create_book but with values populated
  // we have to get all the authors and genres, and the book itself
  // we have the book in the req.params.id
  const [book, genres, authors] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    Genre.find().exec(),
    Author.find().exec(),
  ]);
  if (book == null) {
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }
  for (const genre of genres) {
    for (const gen of book.genre) {
      if (genre._id.toString() === gen._id.toString()) {
        genre.checked = true;
      }
    }
  }
  res.render("book_form", {
    title: "Update Book",
    book,
    authors,
    genres,
  });
});

// handle book update form on POST
// validating data and stuff
exports.book_update_post = [
  //converting the genre selections to array
  // if 1 selected -> string, 2 -> array, undefined -> ""
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim() // here have to check
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  asyncHandler(async function (req, res, next) {
    const errors = validationResult(req);
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
      _id: req.params.id, // to use the old id itself
    });
    if (!errors.isEmpty()) {
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().exec(),
        Genre.find().exec(),
      ]);
      // mark selected genres as checked
      for (const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = true;
        }
      }

      res.render("book_form", {
        title: "Create Book",
        authors: allAuthors,
        genres: allGenres,
        book,
        errors: errors.array(),
      });
    } else {
      let updatedBook = await Book.findByIdAndUpdate(req.params.id, book, {});
      // if (copyBook) {
      //   res.redirect(copyBook.url);
      //   return;
      // }
      res.redirect(updatedBook.url);
    }
  }),
];
