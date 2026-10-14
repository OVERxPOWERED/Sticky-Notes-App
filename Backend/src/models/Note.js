const mongoose = require('mongoose');

/**
 * Mongoose schema for Note position coordinates
 */
const positionSchema = new mongoose.Schema({
  x: {
    type: Number,
    required: true,
    default: 0
  },
  y: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

/**
 * Mongoose schema for Note document
 */
const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100,
    default: '',
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
    default: '',
    trim: true
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-Fa-f]{6}$/,
    default: '#FFEB3B'
  },
  position: {
    type: positionSchema,
    required: true,
    default: () => ({ x: 0, y: 0 })
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  }
});

/**
 * Indexes for common query patterns
 */
noteSchema.index({ createdAt: -1 });
noteSchema.index({ updatedAt: -1 });

/**
 * Static method to create a new note with validation
 * @param {Object} input - Note creation input
 * @returns {Promise<Note>} Created note document
 */
noteSchema.statics.createNote = async function(input) {
  const note = new this(input);
  return await note.save();
};

/**
 * Static method to find note by ID
 * @param {string} id - Note ID
 * @returns {Promise<Note|null>} Note document or null
 */
noteSchema.statics.findById = async function(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return await this.findOne({ _id: id }).exec();
};

/**
 * Static method to find all notes sorted by updatedAt descending
 * @returns {Promise<Note[]>} Array of note documents
 */
noteSchema.statics.findAll = async function() {
  return await this.find().sort({ updatedAt: -1 }).exec();
};

/**
 * Instance method to update note fields
 * @param {Object} updates - Fields to update
 * @returns {Promise<Note>} Updated note document
 */
noteSchema.methods.updateFields = async function(updates) {
  Object.keys(updates).forEach(key => {
    if (key !== '_id' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
      this[key] = updates[key];
    }
  });
  return await this.save();
};

/**
 * Instance method to soft delete (mark as deleted)
 * @returns {Promise<Note>} Updated note document
 */
noteSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  return await this.save();
};

// Create and export the Note model
const Note = mongoose.model('Note', noteSchema);

module.exports = Note;