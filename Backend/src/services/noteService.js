const Note = require('../models/Note');

/**
 * NoteService - Handles all note-related business logic
 * Provides CRUD operations with MongoDB persistence via Mongoose
 */
class NoteService {
  /**
   * Validates note data
   * @param {Object} data - Note data to validate
   * @returns {Object} Validated and sanitized note data
   * @throws {Error} If validation fails
   */
  static validateNoteData(data) {
    const errors = [];

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }

    if (data.title && data.title.length > 200) {
      errors.push('Title must not exceed 200 characters');
    }

    if (data.content !== undefined && data.content !== null && typeof data.content !== 'string') {
      errors.push('Content must be a string');
    }

    if (data.content && data.content.length > 10000) {
      errors.push('Content must not exceed 10,000 characters');
    }

    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push('Tags must be an array');
      } else {
        for (const tag of data.tags) {
          if (typeof tag !== 'string' || tag.trim().length === 0) {
            errors.push('Each tag must be a non-empty string');
            break;
          }
          if (tag.length > 50) {
            errors.push('Each tag must not exceed 50 characters');
            break;
          }
        }
      }
    }

    if (data.isPinned !== undefined && typeof data.isPinned !== 'boolean') {
      errors.push('isPinned must be a boolean');
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.details = errors;
      throw error;
    }

    return {
      title: data.title.trim(),
      content: data.content ? data.content.trim() : '',
      tags: data.tags ? data.tags.map(t => t.trim().toLowerCase()) : [],
      isPinned: data.isPinned === true
    };
  }

  /**
   * Creates a new note
   * @param {Object} data - Note data { title, content?, tags?, isPinned? }
   * @returns {Promise<Object>} Created note with id and timestamps
   */
  async create(data) {
    const validatedData = NoteService.validateNoteData(data);
    
    try {
      const note = await Note.create(validatedData);
      return note.toObject();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        validationError.details = Object.values(error.errors).map(e => e.message);
        throw validationError;
      }
      throw error;
    }
  }

  /**
   * Retrieves a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<Object|null>} Note object or null if not found
   */
  async getById(id) {
    if (!id || typeof id !== 'string') {
      return null;
    }
    
    try {
      const note = await Note.findById(id).lean();
      return note || null;
    } catch (error) {
      if (error.name === 'CastError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Retrieves all notes with optional pagination, filtering, and sorting
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number (1-indexed)
   * @param {number} [options.limit=20] - Items per page (max 100)
   * @param {string} [options.search] - Search term for title/content
   * @param {string[]} [options.tags] - Filter by tags (AND logic)
   * @param {boolean} [options.isPinned] - Filter by pinned status
   * @param {string} [options.sortBy='updatedAt'] - Sort field
   * @param {string} [options.sortOrder='desc'] - Sort order (asc/desc)
   * @returns {Promise<Object>} Paginated result { data, pagination }
   */
  async getAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      tags,
      isPinned,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    // Validate pagination params
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // Build query filter
    const filter = {};
    
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: searchRegex },
        { content: searchRegex }
      ];
    }
    
    if (tags && Array.isArray(tags) && tags.length > 0) {
      filter.tags = { $all: tags.map(t => t.trim().toLowerCase()) };
    }
    
    if (isPinned !== undefined) {
      filter.isPinned = isPinned === true || isPinned === 'true';
    }

    // Build sort object
    const allowedSortFields = ['title', 'createdAt', 'updatedAt', 'isPinned'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    try {
      // Execute queries in parallel
      const [notes, total] = await Promise.all([
        Note.find(filter)
          .sort(sort)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        Note.countDocuments(filter)
      ]);

      return {
        data: notes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates a note by ID
   * @param {string} id - Note ID
   * @param {Object} data - Updated note data
   * @returns {Promise<Object|null>} Updated note or null if not found
   */
  async update(id, data) {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const validatedData = NoteService.validateNoteData(data);
    
    try {
      const note = await Note.findByIdAndUpdate(
        id,
        { $set: validatedData },
        { new: true, runValidators: true }
      ).lean();
      
      return note || null;
    } catch (error) {
      if (error.name === 'CastError') {
        return null;
      }
      if (error.name === 'ValidationError') {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        validation