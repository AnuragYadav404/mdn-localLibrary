const Genre = require("../models/genre");
const Book = require("../models/book");
const asyncHandler = require("express-async-handler");
const Mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");

// For display list of genres
exports.genre_list = asyncHandler(async function (req, res, next) {
  const genres = await Genre.find().sort({ name: 1 }).exec();
  res.render("genre_list", {
    title: "Genre List",
    genre_list: genres,
  });
});

// For display for a particular genre
exports.genre_detail = asyncHandler(async function (req, res, next) {
  const genreId = req.params.id;
  if (!Mongoose.isValidObjectId(genreId)) {
    const err = new Error("Invalid Genre Search");
    err.status = 400;
    return next(err);
  }
  // const genreDoc = await Genre.find({ _id: genreId }).exec();
  // const genreBooks = await Book.find({ genre: genreId });
  // transform 2 await calls to promise.all;
  const [genreDoc, genreBooks] = await Promise.all([
    Genre.findById({ _id: genreId }).exec(),
    Book.find({ genre: genreId }, "title summary").exec(),
  ]);
  if (genreDoc === null) {
    // No results.
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }
  return res.render("genre_detail", {
    title: "Genre Details",
    genre: genreDoc,
    genreBooks: genreBooks,
  });
});

// Display genre create form GET
exports.genre_create_get = function (req, res, next) {
  res.render("genre_form", {
    title: "Genre Form",
  });
  // would rather re-send back a form with a single input for the genre name
  // res.send("Not implemented: genre create GET");
};

// handle genre create POST
// here in the post we are gonna use an array of middleware functions :)
exports.genre_create_post = [
  body("name", "Genre name must contain atleast 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),
  async function (req, res, next) {
    const errors = validationResult(req);
    const genre = req.body.name;
    if (!errors.isEmpty()) {
      res.render("genre_form", {
        title: "Genre Form",
        genre,
        errors: errors.array(),
      });
      return;
    } else {
      const genreExists = await Genre.findOne({ name: genre })
        .collation({ locale: "en", strength: 2 })
        .exec();
      if (genreExists) {
        res.redirect(genreExists.url);
        return;
      } else {
        const genreObj = new Genre({
          name: genre,
        });
        await genreObj.save();
        return res.redirect(genreObj.url);
      }
    }
  },
];

// handle genre delete form on GET
exports.genre_delete_get = asyncHandler(async function (req, res, next) {
  // here genre is referenced by books, same in the case for authors
  const [genre, genreBooks] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }).exec(),
  ]);
  if (genre == null) {
    return res.redirect("/catalog/genres");
  }
  res.render("delete_genre", {
    title: "Delete Genre",
    genre,
    genreBooks,
  });
});

// handle genre delete form on POST
exports.genre_delete_post = asyncHandler(async function (req, res, next) {
  const [genre, genreBooks] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }).exec(),
  ]);
  if (genre == null) {
    return res.redirect("/catalog/genres");
  }
  if (genreBooks.length > 0) {
    res.render("delete_genre", {
      title: "Delete Genre",
      genre,
      genreBooks,
    });
    return;
  } else {
    await Genre.findByIdAndRemove(req.params.id);
    return res.redirect("/catalog/genres");
  }
});

// handle genre update form on GET
exports.genre_update_get = asyncHandler(async function (req, res, next) {
  // genre only has the name field, and we need to maintain the genre _id on updates
  const genredoc = await Genre.findById(req.params.id).exec();
  if (genredoc === null) {
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }
  return res.render("genre_form", {
    title: "Update Genre",
    genre: genredoc.name,
  });
  // res.send("Not Implemented genre update get: ");
});

// handle genre update form on POST
exports.genre_update_post = [
  body("name", "Genre name must contain atleast 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),
  async function (req, res, next) {
    const errors = validationResult(req);
    const genre = req.body.name;
    if (!errors.isEmpty()) {
      res.render("genre_form", {
        title: "Update Genre",
        genre,
        errors: errors.array(),
      });
      return;
    } else {
      const genreExists = await Genre.findOne({ name: genre })
        .collation({ locale: "en", strength: 2 })
        .exec();
      if (genreExists) {
        res.redirect(genreExists.url);
      } else {
        const genreObj = new Genre({
          name: genre,
          _id: req.params.id,
        });
        const updatedGenre = await Genre.findByIdAndUpdate(
          req.params.id,
          genreObj,
          {}
        );
        // await genreObj.save();
        res.redirect(updatedGenre.url);
      }
    }
  },
];
