const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('../models/userModel');
const validator = require('validator');
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name '],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less or equal then 40 characters'],
      minLength: [10, 'A tour name must have more or equal then 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, [true, 'A tour must have a difficulty']],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be more than 1'],
      max: [5, 'Rating must be less than 5'],
      set: (val) => Math.round(val * 10) / 10, // 4.6666,46.6666,47,4.7
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this. only points to current doc on NEW document creation
          return val < this.price;
        },
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A summary on tour'],
    },
    description: { type: String, trim: true },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now() },
    startDates: [Date],
    secretTour: { type: Boolean, default: false },
    slug: String,

    startLocation: {
      //Embedded obj, will have different properties
      // GeoJSON for geospatial data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // For the other locations after start
    // NB we could have location and start location
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    active: { type: Boolean, default: true },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
tourSchema.index({ price: 1, ratingsAverage: 1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // geospatial data needs a 2d sphere index for real points, 2d index for fictional

// virtual property
tourSchema.virtual('durationWeeks').get(function () {
  return Math.ceil(this.duration / 7);
});
// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
// Document middleware: runs before .save() and .create() not on .insertMany() or .update() or findone or findbyid
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
// Middleware to handle logic of getting user based on array of ids given when creating tours

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   // mapp method will assign each value to a place in array but therefore guides will be array of promises
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log('Document saved:', doc);
//   next();
// });

// Query middleware
tourSchema.pre('/^find/', function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

tourSchema.pre('/^find/', function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});
tourSchema.post('/^find/', function (docs, next) {
  console.log('Query took', Date.now() - this.start);

  next();
});

// Aggregation middleware
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: false } } });
//   // console.log(this.pipeline());
//   next();
// });

tourSchema.pre('/^find/', function (next) {
  this.find({ active: true });
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
