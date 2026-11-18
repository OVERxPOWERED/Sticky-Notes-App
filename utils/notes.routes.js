import express from 'express';
import { z } from 'zod';
import { NoteService } from '../services/noteService.js';

const router = express.Router();
const noteService = new NoteService();

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid note ID format'),
});

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().max(50000, 'Content too long').optional().default(''),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  isPinned: z.boolean().optional().default(false),
});

const updateNoteSchema = createNoteSchema.partial();

const positionUpdateSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  tags: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: z.coerce.boolean().default(false),
});

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req[source] = result.data;
  next();
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  '/',
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, search, tags, sortBy, sortOrder, includeDeleted } = req.query;
    const result = await noteService.getAllNotes({
      page,
      limit,
      search,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      sortBy,
      sortOrder,
      includeDeleted,
    });
    res.json(result);
  })
);

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const note = await noteService.getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  })
);

router.post(
  '/',
  validate(createNoteSchema),
  asyncHandler(async (req, res) => {
    const note = await noteService.createNote(req.body);
    res.status(201).json(note);
  })
);

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateNoteSchema),
  asyncHandler(async (req, res) => {
    const note = await noteService.updateNote(req.params.id, req.body);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  })
);

router.patch(
  '/:id/position',
  validate(idParamSchema, 'params'),
  validate(positionUpdateSchema),
  asyncHandler(async (req, res) => {
    const note = await noteService.updateNotePosition(req.params.id, req.body);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  })
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const deleted = await noteService.deleteNote(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(204).send();
  })
);

router.delete(
  '/:id/soft',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const note = await noteService.softDeleteNote(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  })
);

export default router;