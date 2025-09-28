const { body } = require('express-validator');

exports.validateRecipe = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('ingredients')
    .isArray({ min: 1 })
    .withMessage('At least one ingredient is required')
    .custom((ingredients) => {
      if (!ingredients.every(ingredient => typeof ingredient === 'string' && ingredient.trim().length > 0)) {
        throw new Error('All ingredients must be non-empty strings');
      }
      return true;
    }),

  body('instructions')
    .trim()
    .notEmpty()
    .withMessage('Instructions are required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Instructions must be between 10 and 2000 characters'),

  body('cookingTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cooking time must be a positive integer'),

  body('servings')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Servings must be a positive integer'),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];