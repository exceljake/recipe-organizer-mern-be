const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Recipe title is required'],
    trim: true,
    maxLength: [100, 'Title cannot be more than 100 characters']
  },
  ingredients: [{
    type: String,
    required: [true, 'At least one ingredient is required'],
    trim: true
  }],
  instructions: {
    type: String,
    required: [true, 'Instructions are required'],
    trim: true,
    maxLength: [2000, 'Instructions cannot be more than 2000 characters']
  },
  cookingTime: {
    type: Number,
    min: [1, 'Cooking time must be at least 1 minute']
  },
  servings: {
    type: Number,
    min: [1, 'Servings must be at least 1']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
RecipeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create text index for search functionality
RecipeSchema.index({ 
  title: 'text', 
  ingredients: 'text', 
  instructions: 'text' 
});

module.exports = mongoose.model('Recipe', RecipeSchema);