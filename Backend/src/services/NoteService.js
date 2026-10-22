const Note = require('../models/Note');
const { AppError } = require('../utils/errors');

class NoteService {
  async getAllNotes(userId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [notes, total] = await Promise.all([
        Note.find({ userId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Note.countDocuments({ userId })
      ]);

      return {
        notes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getNoteById(noteId, userId) {
    try {
      const note = await Note.findOne({ _id: noteId, userId }).lean();
      if (!note) {
        throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
      }
      return note;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async createNote(userId, noteData) {
    try {
      const note = await Note.create({
        userId,
        title: noteData.title,
        content: noteData.content || '',
        tags: noteData.tags || [],
        isPinned: noteData.isPinned || false,
        color: noteData.color || '#ffffff'
      });
      return note.toObject();
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async updateNote(noteId, userId, updateData) {
    try {
      const allowedUpdates = ['title', 'content', 'tags', 'isPinned', 'color'];
      const updates = {};
      
      for (const key of allowedUpdates) {
        if (updateData[key] !== undefined) {
          updates[key] = updateData[key];
        }
      }

      const note = await Note.findOneAndUpdate(
        { _id: noteId, userId },
        { $set: updates },
        { new: true, runValidators: true }
      ).lean();

      if (!note) {
        throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
      }
      return note;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async deleteNote(noteId, userId) {
    try {
      const note = await Note.findOneAndDelete({ _id: noteId, userId }).lean();
      if (!note) {
        throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
      }
      return { deleted: true, noteId };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async searchNotes(userId, query, options = {}) {
    try {
      const { page = 1, limit = 20, tags } = options;
      const skip = (page - 1) * limit;

      const filter = { userId };

      if (query && query.trim()) {
        const searchRegex = new RegExp(query.trim(), 'i');
        filter.$or = [
          { title: searchRegex },
          { content: searchRegex }
        ];
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      const [notes, total] = await Promise.all([
        Note.find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Note.countDocuments(filter)
      ]);

      return {
        notes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getNotesByTag(userId, tag, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const filter = { userId, tags: tag };

      const [notes, total] = await Promise.all([
        Note.find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Note.countDocuments(filter)
      ]);

      return {
        notes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getAllTags(userId) {
    try {
      const tags = await Note.distinct('tags', { userId });
      return tags.filter(tag => tag && tag.trim()).sort();
    } catch (error) {
      throw this._handleError(error);
    }
  }

  _handleError(error) {
    if (error instanceof AppError) {
      return error;
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return new AppError(messages.join(', '), 400, 'VALIDATION_ERROR');
    }

    if (error.name === 'CastError') {
      return new AppError('Invalid note ID format', 400, 'INVALID_ID');
    }

    if (error.code === 11000) {
      return new AppError('Duplicate entry', 409, 'DUPLICATE_ENTRY');
    }

    return new AppError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

module.exports = new NoteService();