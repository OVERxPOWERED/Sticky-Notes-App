const express = require('express');
const Joi = require('joi');
const NoteService = require('../services/NoteService');

const router = express.Router();

const noteSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().max(10000).allow('').optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  isPinned: Joi.boolean().optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  tag: Joi.string().max(50).optional(),
  search: Joi.string().max(200).optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title').default('updatedAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    return res.status(400).json({ error: 'Validation failed', details });
  }
  req[property] = value;
  next();
};

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, tag, search, sortBy, sortOrder } = req.query;
  const result = await NoteService.list({ page, limit, tag, search, sortBy, sortOrder });
  res.json(result);
}));

router.post('/', validate(noteSchema), asyncHandler(async (req, res) => {
  const note = await NoteService.create(req.body);
  res.status(201).json(note);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const note = await NoteService.getById(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  res.json(note);
}));

router.put('/:id', validate(noteSchema), asyncHandler(async (req, res) => {
  const note = await NoteService.update(req.params.id, req.body);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  res.json(note);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await NoteService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Note not found' });
  }
  res.status(204).send();
}));

router.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.details });
  }
  if (err.name === 'CastError' || err.name === 'MongoServerError') {
    return res.status(400).json({ error: 'Invalid request data' });
  }
  console.error('Notes route error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;