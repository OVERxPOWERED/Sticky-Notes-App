const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} NotePosition
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} NoteData
 * @property {string} id - UUID v4
 * @property {string} title - Note title (max 100 chars)
 * @property {string} content - Note content (max 5000 chars)
 * @property {string} color - Hex color string (e.g., '#FFEB3B')
 * @property {NotePosition} position - Position coordinates
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} CreateNoteInput
 * @property {string} [title=''] - Note title
 * @property {string} [content=''] - Note content
 * @property {string} [color='#FFEB3B'] - Hex color
 * @property {NotePosition} [position={x:0,y:0}] - Position
 */

/**
 * @typedef {Object} UpdateNoteInput
 * @property {string} [title] - Note title
 * @property {string} [content] - Note content
 * @property {string} [color] - Hex color
 * @property {NotePosition} [position] - Position
 */

/**
 * Validation schema for creating a note
 * @type {Joi.ObjectSchema<CreateNoteInput>}
 */
const createNoteSchema = Joi.object({
  title: Joi.string().max(100).allow('').default(''),
  content: Joi.string().max(5000).allow('').default(''),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FFEB3B'),
  position: Joi.object({
    x: Joi.number().default(0),
    y: Joi.number().default(0)
  }).default({ x: 0, y: 0 })
});

/**
 * Validation schema for updating a note
 * @type {Joi.ObjectSchema<UpdateNoteInput>}
 */
const updateNoteSchema = Joi.object({
  title: Joi.string().max(100).allow(''),
  content: Joi.string().max(5000).allow(''),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
  position: Joi.object({
    x: Joi.number(),
    y: Joi.number()
  })
}).min(1);

/**
 * Validation schema for note ID parameter
 * @type {Joi.StringSchema}
 */
const noteIdSchema = Joi.string().uuid({ version: 'uuidv4' });

/**
 * Core Note domain model
 */
class Note {
  /**
   * @param {NoteData} data
   */
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.content = data.content;
    this.color = data.color;
    this.position = data.position;
    this.createdAt = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);
    this.updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt);
  }

  /**
   * Create a new Note instance with generated ID and timestamps
   * @param {CreateNoteInput} input
   * @returns {Note}
   */
  static create(input) {
    const now = new Date();
    const { error, value } = createNoteSchema.validate(input, { abortEarly: false });
    
    if (error) {
      const messages = error.details.map(d => d.message).join('; ');
      throw new Error(`Validation failed: ${messages}`);
    }

    return new Note({
      id: uuidv4(),
      title: value.title,
      content: value.content,
      color: value.color,
      position: value.position,
      createdAt: now,
      updatedAt: now
    });
  }

  /**
   * Validate input for note creation
   * @param {CreateNoteInput} input
   * @returns {{ valid: boolean, error?: string, value?: CreateNoteInput }}
   */
  static validateCreate(input) {
    const { error, value } = createNoteSchema.validate(input, { abortEarly: false });
    if (error) {
      return { valid: false, error: error.details.map(d => d.message).join('; ') };
    }
    return { valid: true, value };
  }

  /**
   * Validate input for note update
   * @param {UpdateNoteInput} input
   * @returns {{ valid: boolean, error?: string, value?: UpdateNoteInput }}
   */
  static validateUpdate(input) {
    const { error, value } = updateNoteSchema.validate(input, { abortEarly: false });
    if (error) {
      return { valid: false, error: error.details.map(d => d.message).join('; ') };
    }
    return { valid: true, value };
  }

  /**
   * Validate note ID format
   * @param {string} id
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateId(id) {
    const { error } = noteIdSchema.validate(id);
    if (error) {
      return { valid: false, error: error.message };
    }
    return { valid: true };
  }

  /**
   * Update note properties
   * @param {UpdateNoteInput} input
   * @returns {Note} Returns this for chaining
   */
  update(input) {
    const { error, value } = updateNoteSchema.validate(input, { abortEarly: false });
    
    if (error) {
      const messages = error.details.map(d => d.message).join('; ');
      throw new Error(`Validation failed: ${messages}`);
    }

    if (value.title !== undefined) this.title = value.title;
    if (value.content !== undefined) this.content = value.content;
    if (value.color !== undefined) this.color = value.color;
    if (value.position !== undefined) this.position = value.position;
    
    this.updatedAt = new Date();
    return this;
  }

  /**
   * Convert to plain object for serialization
   * @returns {NoteData}
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      color: this.color,
      position: this.position,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Note instance from plain object
   * @param {NoteData} data
   * @returns {Note}
   */
  static fromJSON(data) {
    return new Note(data);
  }
}

module.exports = {
  Note,
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema
};