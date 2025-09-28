const express = require('express');
const router = express.Router();
const {
  getAllRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  searchRecipes
} = require('../controllers/recipeController');
const { validateRecipe } = require('../middleware/validation');

// Search route (must come before /:id route)
router.get('/search', searchRecipes);

// CRUD routes
router.route('/')
  .get(getAllRecipes)
  .post(validateRecipe, createRecipe);

router.route('/:id')
  .get(getRecipe)
  .put(validateRecipe, updateRecipe)
  .delete(deleteRecipe);

module.exports = router;