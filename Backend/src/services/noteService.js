const { v4: uuidv4 } = require('uuid');

/**
 * In-memory note store for Milestone 1 (will be replaced with MongoDB in Milestone 2)
 * @type {Map<string, Object>}
 */
const notesStore = new Map();

/**
 * NoteService - Handles all note-related business logic
 * Provides CRUD operations with in-memory storage
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
    const now = new Date().toISOString();
    const id = uuidv4();

    const note = {
      id,
      ...validatedData,
      createdAt: now,
      updatedAt: now
    };

    notesStore.set(id, note);
    return { ...note };
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
    const note = notesStore.get(id);
    return note ? { ...note } : null;
  }

  /**
   * Retrieves all notes with optional pagination and filtering
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

    // Get all notes as array
    let notes = Array.from(notesStore.values());

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      notes = notes.filter(note =>
        note.title.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower)
      );
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagSet = new Set(tags.map(t => t.toLowerCase()));
      notes = notes.filter(note =>
        note.tags.some(tag => tagSet.has(tag))
      );
    }

    if (isPinned !== undefined) {
      notes = notes.filter(note => note.isPinned === isPinned);
    }

    // Apply sorting
    const validSortFields = ['title', 'createdAt', 'updatedAt', 'isPinned'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    const order = sortOrder === 'asc' ? 1 : -1;

    notes.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });

    // Pinned notes first (secondary sort)
    notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    // Calculate pagination
    const total = notes.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const data = notes.slice(start, end).map(note => ({ ...note }));

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    };
  }

  /**
   * Updates a note by ID
   * @param {string} id - Note ID
   * @param {Object} data - Updated note data (partial allowed)
   * @returns {Promise<Object|null>} Updated note or null if not found
   * @throws {Error} If