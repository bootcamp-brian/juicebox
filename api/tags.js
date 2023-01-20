const express = require('express');
const tagsRouter = express.Router();
const { getAllTags, getPostsByTagName } = require('../db');

// notification middleware
tagsRouter.use((req, res, next) => {
  console.log("A request is being made to /tags");

  next();
});

// GET route for getting accessable posts by tag name
tagsRouter.get('/:tagName/posts', async (req, res, next) => {
  // get the tagName from request params
  const { tagName } = req.params;
  try {
    // gets all posts associated with provided tagName
    const allPosts = await getPostsByTagName(tagName);

    // filters posts for posts that are active or authored by the current user
    const posts = allPosts.filter(post => {
      if (post.active) {
        return true;
      }

      if (req.user && post.author.id === req.user.id) {
        return true;
      }

      return false;
    });

    // if there were any accessable posts associated with the given tagName, send them
    if (posts && posts.length > 0) {
      res.send({ posts });
    } else {
      next({
        name: 'NoPostsError',
        message: 'There are no posts with that tag'
      })
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// GET route to get all tags
tagsRouter.get('/', async (req, res) => {
    const tags = await getAllTags();
    
    res.send({
        tags
    });
});

module.exports = tagsRouter;