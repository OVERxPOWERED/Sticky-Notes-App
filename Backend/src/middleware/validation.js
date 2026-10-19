const { body, param, query, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

const validateNoteId = [
  param('id')
    .custom(value => {
      if (!ObjectId.isValid(value)) {
        throw new Error('Invalid note ID format');
      }
      return true;
    })
    .withMessage('Note ID must be a valid MongoDB ObjectId'),
  validate
];

const validateNoteInput = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters')
    .escape(),
  
  body('content')
    .optional()
    .isString()
    .withMessage('Content must be a string')
    .isLength({ max: 5000 })
    .withMessage('Content must not exceed 5000 characters')
    .escape(),
  
  body('color')
    .optional()
    .matches(hexColorRegex)
    .withMessage('Color must be a valid hex color (e.g., #FF5733 or #F53)'),
  
  body('position')
    .optional()
    .isObject()
    .withMessage('Position must be an object'),
  
  body('position.x')
    .optional()
    .isNumeric()
    .withMessage('Position x must be a number'),
  
  body('position.y')
    .optional()
    .isNumeric()
    .withMessage('Position y must be a number'),
  
  validate
];

const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sort')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'position'])
    .withMessage('Invalid sort field'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .isLength({ max: 100 })
    .withMessage('Search query too long')
    .escape(),
  
  query('color')
    .optional()
    .matches(hexColorRegex)
    .withMessage('Color filter must be a valid hex color'),
  
  validate
];

module.exports = {
  validate,
  validateNoteId,
  validateNoteInput,
  validateQueryParams
};