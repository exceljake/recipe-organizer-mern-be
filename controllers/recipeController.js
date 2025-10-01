const Recipe = require('../models/recipe');
const { validationResult } = require('express-validator');

// @desc    Get all recipes
// @route   GET /api/recipes
// @access  Public
exports.getAllRecipes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};
    
    // Filter by difficulty if provided
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }

    // Filter by tags if provided
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      filter.tags = { $in: tags };
    }

    const recipes = await Recipe.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'); // Exclude version key

    const total = await Recipe.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: recipes.length,
      pagination: {
        currentPage: page,
        totalPages,
        limit,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      data: recipes
    });
  } catch (error) {
    console.error('Get all recipes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get single recipe
// @route   GET /api/recipes/:id
// @access  Public
exports.getRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).select('-__v');

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.status(200).json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error('Get recipe error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create new recipe
// @route   POST /api/recipes
// @access  Public
exports.createRecipe = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    // Clean up ingredients array (remove empty strings and trim)
    if (req.body.ingredients) {
      req.body.ingredients = req.body.ingredients
        .filter(ingredient => ingredient && ingredient.trim().length > 0)
        .map(ingredient => ingredient.trim());
    }

    // Clean up tags array
    if (req.body.tags) {
      req.body.tags = req.body.tags
        .filter(tag => tag && tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase());
    }

    const recipe = await Recipe.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Recipe created successfully',
      data: recipe
    });
  } catch (error) {
    console.error('Create recipe error:', error);

    // Handle duplicate key error (if you add unique constraints later)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Recipe with this title already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Recipe validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create recipe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update recipe
// @route   PUT /api/recipes/:id
// @access  Public
exports.updateRecipe = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    // Clean up arrays
    if (req.body.ingredients) {
      req.body.ingredients = req.body.ingredients
        .filter(ingredient => ingredient && ingredient.trim().length > 0)
        .map(ingredient => ingredient.trim());
    }

    if (req.body.tags) {
      req.body.tags = req.body.tags
        .filter(tag => tag && tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase());
    }

    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validations
        select: '-__v' // Exclude version key
      }
    );

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Recipe updated successfully',
      data: recipe
    });
  } catch (error) {
    console.error('Update recipe error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format'
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Recipe validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update recipe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete recipe
// @route   DELETE /api/recipes/:id
// @access  Public
exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Recipe deleted successfully',
      data: {
        id: recipe._id,
        title: recipe.title
      }
    });
  } catch (error) {
    console.error('Delete recipe error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete recipe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Search recipes
// @route   GET /api/recipes/search
// @access  Public
exports.searchRecipes = async (req, res) => {
  try {
    const { 
      q, 
      ingredient, 
      difficulty, 
      tags, 
      cookingTimeMax, 
      servingsMin,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const skip = (page - 1) * limit;
    let query = {};
    let sortOptions = { createdAt: -1 };

    // Text search across title, ingredients, and instructions
    if (q) {
      query.$text = { $search: q };
      sortOptions = { score: { $meta: 'textScore' }, createdAt: -1 };
    }

    // Search by specific ingredient
    if (ingredient) {
      query.ingredients = { $regex: ingredient, $options: 'i' };
    }

    // Filter by difficulty
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      query.difficulty = difficulty;
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
    }

    // Filter by cooking time (max)
    if (cookingTimeMax && !isNaN(cookingTimeMax)) {
      query.cookingTime = { $lte: parseInt(cookingTimeMax) };
    }

    // Filter by minimum servings
    if (servingsMin && !isNaN(servingsMin)) {
      query.servings = { $gte: parseInt(servingsMin) };
    }

    const recipes = await Recipe.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Recipe.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: recipes.length,
      searchQuery: {
        textSearch: q || null,
        ingredient: ingredient || null,
        difficulty: difficulty || null,
        tags: tags || null,
        cookingTimeMax: cookingTimeMax || null,
        servingsMin: servingsMin || null
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        limit: parseInt(limit),
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      data: recipes
    });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search recipes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get recipe statistics
// @route   GET /api/recipes/stats
// @access  Public
exports.getRecipeStats = async (req, res) => {
  try {
    const stats = await Recipe.aggregate([
      {
        $group: {
          _id: null,
          totalRecipes: { $sum: 1 },
          avgCookingTime: { $avg: '$cookingTime' },
          avgServings: { $avg: '$servings' },
          difficulties: {
            $push: '$difficulty'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalRecipes: 1,
          avgCookingTime: { $round: ['$avgCookingTime', 1] },
          avgServings: { $round: ['$avgServings', 1] },
          difficulties: 1
        }
      }
    ]);

    // Count recipes by difficulty
    const difficultyStats = await Recipe.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get most common tags
    const tagStats = await Recipe.aggregate([
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const result = {
      success: true,
      data: {
        overview: stats[0] || {
          totalRecipes: 0,
          avgCookingTime: 0,
          avgServings: 0
        },
        difficultyBreakdown: difficultyStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topTags: tagStats.map(tag => ({
          name: tag._id,
          count: tag.count
        }))
      }
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Get recipe stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipe statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};