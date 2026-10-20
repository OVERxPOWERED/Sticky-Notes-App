import express from 'express';
import { NoteService } from '../services/note.service.js';
import { validateNoteInput, validateNoteId } from '../middleware/validation.js';

const router = express.Router();
const noteService = new NoteService();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, tags, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    const result = await noteService.getAllNotes({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      tags: tags ? tags.split(',') : undefined,
      sortBy,
      sortOrder,
    });
    res.json(result);
  })
);

router.get(
  '/:id',
  validateNoteId,
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
  validateNoteInput,
  asyncHandler(async (req, res) => {
    const note = await noteService.createNote(req.body);
    res.status(201).json(note);
  })
);

router.put(
  '/:id',
  validateNoteId,
  validateNoteInput,
  asyncHandler(async (req, res) => {
    const note = await noteService.updateNote(req.params.id, req.body);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  })
);

router.delete(
  '/:id',
  validateNoteId,
  asyncHandler(async (req, res) => {
    const deleted = await noteService.deleteNote(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(204).send();
  })
);

export default router;