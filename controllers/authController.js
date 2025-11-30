const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
// create and send a cookie
//send
// Takes user as pass is in, status code, error message
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  console.log('here is cookie', cookieOptions.expires);
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  // remove password from output
  user.password = undefined;
  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) check if email & pass exist
  if (!email || !password)
    return next(new AppError('Invalid Login Credentials', 400));
  // 2) check if user exist and password correct
  const user = await User.findOne({ email }).select('+password');
  if (!user) return next(new AppError('User not found', 400));

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Incorrect email or password', 401));
  //3) If everything is ok, send token to client
  createSendToken(user, 201, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token)
    return next(
      new AppError('You are not logged in, please log in to gain access', 401),
    );
  console.log('Token received:', token);
  // 2) Validate the token (Verificatiom)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);
  // 3) Check if user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The user belonging to the token no longer exist'),
    );
  // 4) check if user changed password after JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return new AppError('User recently Changed Pass! Please login Again', 401);

  //grant access to protected route
  req.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You dont have permission to perform this action!!', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user)
    return next(new AppError('There is no user with email address', 404));
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3) Send it to the user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password ? Submit a PATCH request with your new password and passwordConfirm to : ${resetURL}.\n If you didnt forget your password please ignore this email. `;
  // An error might happen here, and solution is not only send error but to reser token and expiry so we'll make a try ctch
  try {
    await Email({
      email: req.body.email,
      subject: 'Your password reset token (valid for 10 min',
      message,
    });
    res
      .status(200)
      .json({ status: 'success', message: 'Token sent to email!' });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later',
        500,
      ),
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token, and checks if within expiry or not
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3) Update changePasswordAt property for the user
  // 4) log the user in, send JWT
  createSendToken(user, 201, res);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from the collection,+pass bec passes doesnt automatically come back
  const user = await User.findById(req.user.id).select('+password');

  //2) check if posted password is correct
  const { passwordCurrent } = req.body;
  if (!(await user.correctPassword(passwordCurrent, user.password)))
    return next(new AppError('Invalid password entered', 401));
  //3) If so,update pass
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  //will not touch validators so they can perform equality check on password confirm
  await user.save();
  //4) Log user in sned JWT
  createSendToken(user, 201, res);
});
