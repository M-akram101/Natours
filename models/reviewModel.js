const mongoose = require('mongoose');
const Tour = require('./tourModel');
const slugify = require('slugify');
const validator = require('validator');

const reviewSchema = new mongoose.Schema(
  {
    review: { type: String, required: [true, 'Review can not be empty'] },
    rating: {
      type: Number,
      min: [1, 'rating cannot be smaller than 1'],
      max: [5, 'rating cannot be bigger than 5'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    createdAt: { type: Date, default: Date.now() },
    active: { type: Boolean, default: true },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});
// reviewSchema.pre(/^find/, function (next) {
//   this.find({ active: true });
//   next();
// });
// A static method that will calculate average rating and number of rating and updated whenever reviews are C,U or D
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // console.log('YourTourId:', tourId);
  const stats = await this.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log('here is your stats', stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};
// this points to current review
reviewSchema.post('save', function () {
  // instead of Review. we couldnt use as its declared in the end, we used this.constructor to go around it
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  //executed the query to get acess to the document, will get from it the tourId, but data that come back is the old not the updated

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); : this does not work here, query has already executed
  // after query is finished, and review is updated, but how to get the tour Id ??????
  await this.r.constructor.calcAverageRatings(this.r.tour);
});
const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
