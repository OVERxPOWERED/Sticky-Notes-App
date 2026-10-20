const NoteService = require('../services/noteService');

const handleError = (error, res) => {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  if (error.message === 'Note not found') {
    return res.status(404).json({ error: 'Note not found' });
  }
  console.error('Controller error:', error);
  return res.status(500).json({ error: 'Internal server error' });
};

const getAllNotes = async (req, res, next) => {
  try {
    const notes = await NoteService.getAllNotes();
    res.status(200).json(notes);
  } catch (error) {
    handleError(error, res);
  }
};

const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await NoteService.getNoteById(id);
    res.status(200).json(note);
  } catch (error) {
    handleError(error, res);
  }
};

const createNote = async (req, res, next) => {
  try {
    const noteData = req.body;
    const note = await NoteService.createNote(noteData);
    res.status(201).json(note);
  } catch (error) {
    handleError(error, res);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const note = await NoteService.updateNote(id, updateData);
    res.status(200).json(note);
  } catch (error) {
    handleError(error, res);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    await NoteService.deleteNote(id);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
};