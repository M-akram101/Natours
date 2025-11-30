// fn upon calling will add methods to app
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const viewRouter = require('./routes/viewRoutes');
const app = express();

// setting up pug as view engine,  templating engine
//
app.set('view engine', 'pug');
//Middleware for serving static files, so in html / views files they get all rss's from public folder
app.use(express.static(`${__dirname}/public`));

//location of the views
app.set('views', path.join(__dirname, 'views'));
//
// Middleware stack
//// 1) Global MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//Secuirty headers, better set in beginning
app.use(helmet());

// Limit requests from same api
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this Ip, please try again in an hour',
});
app.use('/api', limiter);

//For body parsing, reading data from body into req.body/ and limiting i/p data
app.use(express.json({ limit: '10kb' }));

//Perfect place for data sanitization, right after req body is parsed
// Data sanitization against NoSQL query injection,
// filters out all dollar signs and dots from req body and params
app.use(mongoSanitize());
// Data sanitization against XSS
// prevent entering any html code with js in example, filter out html elements
// mongoose itself saves alot from xss
app.use(xss());
//Prevent parameter pollution
app.use(
  hpp({
    whiteList: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.headers);
  next();
});
// Route to render views
app.use(('/', viewRouter));
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;
  // next(err);
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
