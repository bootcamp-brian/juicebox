const express = require('express');
const postsRouter = express.Router();
const { getAllPosts, createPost, updatePost, getPostById } = require('../db');
const { requireUser } = require('./utils');

// notification middleware
postsRouter.use((req, res, next) => {
  console.log("A request is being made to /posts");

  next();
});

// GET request route for accessable posts
postsRouter.get('/', async (req, res) => {
    // gets all posts
    const allPosts = await getAllPosts();

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

    // sends filtered posts
    res.send({
        posts
    });
});

// POST route for creating a new post
postsRouter.post('/', requireUser, async (req, res, next) => {
  // destructure data from request body
  const { title, content, tags = "" } = req.body;

  // turn tags from body into an array
  const tagArr = tags.trim().split(/\s+/)
  // create object to hold reformatted data
  const postData = {};

  // if there were tags in the request body, add them to postData object
  if (tagArr.length) {
    postData.tags = tagArr;
  }

  try {
    // add authorId, title, content to postData object
    postData.authorId = req.user.id;
    postData.title = title;
    postData.content = content;
    
    // create new post and tags if provided using postData object
    const post = await createPost(postData);

    // if a post was successfully created, send it
    if (post) {
      res.send({
        post
      });
    } else {
      next({ name: 'CreatePostError', message: 'Unable to create post' });
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});


// PATCH route for editing posts
postsRouter.patch('/:postId', requireUser, async (req, res, next) => {
  // destructure postId from request params
  const { postId } = req.params;
  // destructure data used for updates from request body
  const { title, content, tags } = req.body;

  // create object to hold reformatted data
  const updateFields = {};

  // if there are tags in the request body, turn them into an array and attach them to updateFields object
  if (tags && tags.length > 0) {
    updateFields.tags = tags.trim().split(/\s+/);
  }

  // if there's a title in the request body, add it to updateFields object
  if (title) {
    updateFields.title = title;
  }

  // if there's a content in the request body, add it to the updateFields object
  if (content) {
    updateFields.content = content;
  }

  try {
    // get the original post to be updated
    const originalPost = await getPostById(postId);


    // check if user is the author of the original post
    if (originalPost.author.id === req.user.id) {
      // update the post with the data from updateFields object and send it
      const updatedPost = await updatePost(postId, updateFields);
      res.send({ post: updatedPost })
    } else {
      next({
        name: 'UnauthorizedUserError',
        message: 'You cannot update a post that is not yours'
      })
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});


// DELETE route to set a post to inactive
postsRouter.delete('/:postId', requireUser, async (req, res, next) => {
  try {
    // get target post using postId from request params
    const post = await getPostById(req.params.postId);

    // check if user is post author
    if (post && post.author.id === req.user.id) {
      // update post by changing active key to false and send it
      const updatedPost = await updatePost(post.id, { active: false });

      res.send({ post: updatedPost });
    } else {
      next(post ? { 
        name: "UnauthorizedUserError",
        message: "You cannot delete a post which is not yours"
      } : {
        name: "PostNotFoundError",
        message: "That post does not exist"
      });
    }

  } catch ({ name, message }) {
    next({ name, message })
  }
});

module.exports = postsRouter;