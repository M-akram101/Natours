const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
    validate: validator.isAlpha,
  },
  email: {
    type: String,
    required: [true, 'A user must have an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['admin', 'lead-guide', 'guide', 'user'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: { type: Boolean, default: true, select: false },
  review: [{ type: mongoose.Schema.ObjectId, ref: 'Review' }],
});
// /^? : for any query with find
userSchema.pre(/^find/, function (next) {
  //this points to the current query
  this.find({ active: true });
  next();
});
userSchema.pre('save', async function (next) {
  // Only run if passes were modified
  if (!this.isModified('password')) return next();
  // hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // delete passwordConfirm field
  this.passwordConfirm = undefined;
});
// Updating passwordChangedAtProperty for reset token
userSchema.pre('save', function (next) {
  //Wont update if password isnt changed and if created for the first time
  if (!this.isModified('password') || this.isNew) return next();
  //changed in cosidering that saving to db takes time so in order to be near jwt timestamp w subtract a sec
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  console.log('-------------------------Entered uncy');
  console.log(this.passwordChangedAt);
  let changedTimeStamp;
  if (this.passwordChangedAt) {
    changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    console.log(changedTimeStamp, JWTTimestamp);
  }
  // if pass changed after token made then return falses
  return JWTTimestamp < changedTimeStamp;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log(
    'Reset Token: ',
    { resetToken },
    'Hashed pass reset Token: ',
    this.passwordResetToken,
  );
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};
const User = mongoose.model('User', userSchema);

module.exports = User;
