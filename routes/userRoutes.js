const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  updateMe,
  deleteUser,
  deleteMe,
  getMe,
  uploadUserPhoto,
  resizeUserPhoto,
} = userController;
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  protect,
  restrictTo,
  updatePassword,
} = authController;

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

router.post('/forgotPassword', forgotPassword);

router.patch('/resetPassword/:token', resetPassword);

// Protect all routes after tthis midd ware
router.use(protect);
router.use(restrictTo('admin', 'user'));
router.patch('/updateMyPassword', updatePassword);

router.get('/me', getMe, getUser);

router.patch('/updateMe', uploadUserPhoto, resizeUserPhoto, updateMe);
router.delete('/deleteMe', deleteMe);

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
