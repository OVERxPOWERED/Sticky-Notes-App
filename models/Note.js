const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 }
}, { _id: false });

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
  },
  deletedAt: { type: Date, default: null, index: true }
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

noteSchema.index({ updatedAt: -1 });
noteSchema.index({ createdAt: -1 });

noteSchema.statics.createNote = async function(input) {
  return await new this(input).save();
};

noteSchema.statics.findById = async function(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await this.findOne({ _id: id, deletedAt: null }).exec();
};

noteSchema.statics.findAll = async function() {
  return await this.find({ deletedAt: null }).sort({ updatedAt: -1 }).exec();
};

noteSchema.methods.updateFields = async function(updates) {
  const protectedFields = ['_id', 'id', 'createdAt', 'updatedAt', 'deletedAt'];
  Object.keys(updates)
    .filter(key => !protectedFields.includes(key))
    .forEach(key => { this[key] = updates[key]; });
  return await this.save();
};

noteSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('Note', noteSchema);