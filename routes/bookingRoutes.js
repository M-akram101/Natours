const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const {
  getCheckoutSession,
  getAllBookings,
  createBooking,
  getBooking,
  updateBooking,
} = bookingController;
const { protect, restrictTo } = authController;

const router = express.Router();

router.get('/checkout-session/:tourId', protect, getCheckoutSession);
router.use(protect);
router.use(restrictTo('user')); // only users can make bookings

router.route('/').get(getAllBookings).post(createBooking);

router.route('/:id').get(getBooking).patch(updateBooking);

module.exports = router;
