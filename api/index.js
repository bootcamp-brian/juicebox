const express = require('express');
const apiRouter = express.Router();
const jwt = require('jsonwebtoken');
const { getUserById } = require('../db');
const { JWT_SECRET } = process.env;


// jsonwebtoken authorization middleware
apiRouter.use(async (req, res, next) => {
    const prefix = 'Bearer ';
    const auth = req.header('Authorization');
  
    // checks for auth in request header
    if (!auth) {
      next();
    } else if (auth.startsWith(prefix)) {
      // grabs token from auth in request header
      const token = auth.slice(prefix.length);
  
      try {
        // decodes id from token
        const { id } = jwt.verify(token, JWT_SECRET);
  
        // checks for id from token
        if (id) {
          // uses id from token to get user data and attaches it to the request object
          req.user = await getUserById(id);
          next();
        }
      } catch ({ name, message }) {
        next({ name, message });
      }
    } else {
      next({
        name: 'AuthorizationHeaderError',
        message: `Authorization token must start with ${ prefix }`
      });
    }
});

// middleware that logs the user data
apiRouter.use((req, res, next) => {
  if (req.user) {
    console.log("User is set:", req.user);
  }

  next();
});

// Router setup
const usersRouter = require('./users');
apiRouter.use('/users', usersRouter);

const postsRouter = require('./posts');
apiRouter.use('/posts', postsRouter);

const tagsRouter = require('./tags');
apiRouter.use('/tags', tagsRouter);


// error handling middleware
apiRouter.use((error, req, res, next) => {
    res.send({
      name: error.name,
      message: error.message
    });
});
  
module.exports = apiRouter;