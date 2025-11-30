const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { data: doc },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // Execute Query
    // To Allow for nested GET reviews on tour (Hack!!)
    let filter = {};
    if (req.params.tour) filter = { tour: req.params.tour };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const docs = await features.query.explain();
    const docs = await features.query;
    //query.sort().select().skip().limit()

    // Send Response
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: { data: docs },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = await Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No doc found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { data: doc },
    });
  });
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError('No doc found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { data: doc } });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success', data: null });
    if (!doc) {
      return next(new AppError('No doc found with that ID', 404));
    }
  });
