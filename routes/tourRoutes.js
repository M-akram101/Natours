const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
// const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./../routes/reviewRoutes');
const { protect, restrictTo } = authController;
const {
  getAllTours,
  getTour,
  getToursWithin,
  getDistances,
  createTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  uploadTourImages,
  resizeTourImages,
} = tourController;
const router = express.Router();

//Nested Routes
// Post /tour/:tourId/reviews
// Get /tour/:tourId/reviews
// Get /tour/:tourId/reviews/:reviewId
// router.route('/:tour/reviews').post(protect, restrictTo('user'), createReview);
router.use('/:tour/reviews', reviewRouter);
//--------------------------------------------------------------------------------------------//
// router.param('id', checkId);
router.route('/top-5-cheap').get(aliasTopTours, getAllTours);
router.route('/tour-stats').get(getTourStats); // getTourStats
router
  .route('/monthly-plan/:year')
  .get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan); // getMonthlyPlan
// giberish:  /tour-distance?distance=233&center=-40.45&unit=mi
// standard: /tours-distance/233/center/-40,45/unit/mi
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getToursWithin);
router.route('/distances/:latlng/unit/:unit').get(getDistances);
router
  .route('/')
  .get(getAllTours)
  .post(protect, restrictTo('admin', 'lead-guide'), createTour);
router
  .route('/:id')
  .get(getTour)
  .patch(
    protect,
    restrictTo('admin', 'lead-guide', 'user'),
    uploadTourImages,
    resizeTourImages,
    updateTour,
  );
router.delete(
  '/:id',
  protect,
  restrictTo('admin', 'lead-guide', 'user'),
  deleteTour,
);
module.exports = router;
