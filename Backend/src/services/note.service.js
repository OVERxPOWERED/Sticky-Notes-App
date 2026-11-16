const Note = require('../models/Note');
const { AppError } = require('../utils/errors');

class NoteService {
  constructor() {
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    if (this.initialized) return;
    await this.createIndexes();
    this.initialized = true;
  }

  async createIndexes() {
    await Note.collection.createIndex(
      { title: 'text', content: 'text' },
      { name: 'text_search_index', default_language: 'english' }
    );
    await Note.collection.createIndex(
      { tags: 1 },
      { name: 'tags_index' }
    );
    await Note.collection.createIndex(
      { archived: 1 },
      { name: 'archived_index' }
    );
    await Note.collection.createIndex(
      { userId: 1, createdAt: -1 },
      { name: 'user_created_index' }
    );
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  validatePagination(page, limit) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return { page: parsedPage, limit: parsedLimit };
  }

  buildMatchStage(filters) {
    const match = {};

    if (filters.userId) {
      match.userId = filters.userId;
    }

    if (filters.archived !== undefined) {
      match.archived = filters.archived === 'true' || filters.archived === true;
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagArray = Array.isArray(filters.tags) ? filters.tags : filters.tags.split(',');
      match.tags = { $in: tagArray.map(t => t.trim()) };
    }

    return match;
  }

  buildSortStage(sortBy, sortOrder) {
    const allowedSortFields = ['createdAt', 'updatedAt', 'title'];
    const allowedSortOrders = ['asc', 'desc'];

    const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = allowedSortOrders.includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    return { [field]: order === 'asc' ? 1 : -1 };
  }

  async findAllWithFilters(filters = {}) {
    await this.ensureInitialized();

    const {
      search,
      tags,
      archived,
      userId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const { page: validatedPage, limit: validatedLimit } = this.validatePagination(page, limit);
    const skip = (validatedPage - 1) * validatedLimit;

    const matchStage = this.buildMatchStage({ userId, archived, tags });

    const pipeline = [];

    if (search && search.trim()) {
      pipeline.push(
        {
          $match: {
            ...matchStage,
            $text: { $search: search.trim() }
          }
        },
        {
          $addFields: { score: { $meta: 'textScore' } }
        },
        {
          $sort: { score: { $meta: 'textScore' }, ...this.buildSortStage(sortBy, sortOrder) }
        }
      );
    } else {
      pipeline.push(
        { $match: matchStage },
        { $sort: this.buildSortStage(sortBy, sortOrder) }
      );
    }

    pipeline.push(
      { $skip: skip },
      { $limit: validatedLimit },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          tags: 1,
          archived: 1,
          userId: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    );

    const [notes, total] = await Promise.all([
      Note.aggregate(pipeline).exec(),
      this.getTotalCount({ userId, archived, tags, search })
    ]);

    const totalPages = Math.ceil(total / validatedLimit);

    return {
      notes,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNext: validatedPage < totalPages,
        hasPrev: validatedPage > 1
      }
    };
  }

  async getTotalCount(filters = {}) {
    await this.ensureInitialized();

    const { userId, archived, tags, search } = filters;
    const matchStage = this.buildMatchStage({ userId, archived, tags });

    if (search && search.trim()) {
      matchStage.$text = { $search: search.trim() };
    }

    return Note.countDocuments(matchStage).exec();
  }

  async findById(id, userId) {
    await this.ensureInitialized();
    const note = await Note.findOne({ _id: id, userId }).exec();
    if (!note) {
      throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
    }
    return note;
  }

  async create(data, userId) {
    await this.ensureInitialized();
    const note = new Note({ ...data, userId });
    return note.save();
  }

  async update(id, data, userId) {
    await this.ensureInitialized();
    const note = await Note.findOneAndUpdate(
      { _id: id, userId },
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
    if (!note) {
      throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
    }
    return note;
  }

  async delete(id, userId) {
    await this.ensureInitialized();
    const note = await Note.findOneAndDelete({ _id: id, userId }).exec();
    if (!note) {
      throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
    }
    return note;
  }

  async bulkDelete(ids, userId) {
    await this.ensureInitialized();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('Invalid IDs array', 400, 'INVALID_IDS');
    }

    const result = await Note.deleteMany({ _id: { $in: ids }, userId }).exec();
    
    return {
      deletedCount: result.deletedCount,
      requestedCount: ids.length
    };
  }

  async toggleArchive(id, userId) {
    await this.ensureInitialized();
    const note = await Note.findOne({ _id: id, userId }).exec();
    if (!note) {
      throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
    }
    note.archived = !note.archived;
    return note.save();
  }

  async getTags(userId) {
    await this.ensureInitialized();
    const tags = await Note.distinct('tags', { userId, archived: false }).exec();
    return tags.filter(Boolean).sort();
  }
}

module.exports = new NoteService();