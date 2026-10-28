const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 }
}, { _id: false });

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
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
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: { type: Date, default: null }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  }
});

// Compound index for listing user's notes sorted by creation date (newest first)
// Used by: GET /api/notes?userId=:userId
noteSchema.index({ userId: 1, createdAt: -1 });

// Compound index for position-based queries (drag/drop reordering)
// Used by: GET /api/notes?userId=:userId&position=true, PUT /api/notes/:id/position
noteSchema.index({ userId: 1, position: 1 });

// Compound index for soft-delete filtering with partial index optimization
// Partial filter excludes deleted notes from index, reducing size and improving write performance
// Used by: All queries filtering by isDeleted: false
noteSchema.index(
  { userId: 1, isDeleted: 1 },
  { partialFilterExpression: { isDeleted: false } }
);

// Legacy indexes for backward compatibility
noteSchema.index({ updatedAt: -1 });
noteSchema.index({ createdAt: -1 });

noteSchema.statics.createNote = async function(input) {
  return await new this(input).save();
};

noteSchema.statics.findById = async function(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await this.findOne({ _id: id, isDeleted: false }).exec();
};

noteSchema.statics.findAll = async function() {
  return await this.find({ isDeleted: false }).sort({ updatedAt: -1 }).exec();
};

noteSchema.statics.findByUserId = async function(userId, options = {}) {
  const { sort = { createdAt: -1 }, limit, skip } = options;
  const query = this.find({ userId, isDeleted: false }).sort(sort);
  if (skip) query.skip(skip);
  if (limit) query.limit(limit);
  return await query.exec();
};

noteSchema.methods.updateFields = async function(updates) {
  const protectedFields = ['_id', 'id', 'userId', 'createdAt', 'updatedAt', 'deletedAt', 'isDeleted'];
  Object.keys(updates)
    .filter(key => !protectedFields.includes(key))
    .forEach(key => { this[key] = updates[key]; });
  return await this.save();
};

noteSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

noteSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = null;
  return await this.save();
};

module.exports = mongoose.model('Note', noteSchema);