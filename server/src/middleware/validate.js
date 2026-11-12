// src/middleware/validate.js
const { validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array().map((e) => ({ field: e.path, message: e.msg })));
  }
  next();
};

module.exports = validate;
