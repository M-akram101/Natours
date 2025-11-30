const express = require('express');
const reviewController = require('./../controllers/reviewController');
const {
  getAllReviews,
  getReview,
  createReview,
  setTourUserIds,
  updateReview,
  deleteReview,
} = reviewController;
const authController = require('./../controllers/authController');
const { protect, restrictTo } = authController;

const router = express.Router({ mergeParams: true });
router.use(protect);
router
  .route('/')
  .get(getAllReviews)
  .post(restrictTo('user'), setTourUserIds, createReview);

router
  .route('/:id')
  .get(getReview)
  .patch(restrictTo('user', 'admin'), updateReview)
  .delete(restrictTo('user', 'admin'), deleteReview);
module.exports = router;
