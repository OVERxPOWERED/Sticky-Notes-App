const express = require('express');
const { body, param, query } = require('express-validator');
const noteController = require('../controllers/noteController');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { noteQuerySchema } = require('../validation/noteValidation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  validate(noteQuerySchema),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        search,
        page = 1,
        limit = 20,
        tags,
        archived,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        search,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
        sortBy,
        sortOrder
      };

      const result = await noteController.findAllWithFilters(userId, filters);

      res.json({
        success: true,
        data: result.notes,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  validate([
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
    body('content').optional().isString().withMessage('Content must be a string'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isMongoId().withMessage('Each tag must be a valid ObjectId'),
    body('isArchived').optional().isBoolean().withMessage('isArchived must be a boolean'),
    body('isPinned').optional().isBoolean().withMessage('isPinned must be a boolean')
  ]),
  noteController.create
);

router.get(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid note ID')
  ]),
  noteController.findById
);

router.patch(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid note ID'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
    body('content').optional().isString().withMessage('Content must be a string'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isMongoId().withMessage('Each tag must be a valid ObjectId'),
    body('isArchived').optional().isBoolean().withMessage('isArchived must be a boolean'),
    body('isPinned').optional().isBoolean().withMessage('isPinned must be a boolean')
  ]),
  noteController.update
);

router.delete(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid note ID')
  ]),
  noteController.delete
);

router.patch(
  '/:id/archive',
  validate([
    param('id').isMongoId().withMessage('Invalid note ID')
  ]),
  noteController.toggleArchive
);

router.patch(
  '/:id/pin',
  validate([
    param('id').isMongoId().withMessage('Invalid note ID')
  ]),
  noteController.togglePin
);

module.exports = router;