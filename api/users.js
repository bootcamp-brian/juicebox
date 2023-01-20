const express = require('express');
const usersRouter = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const { getAllUsers, getUserByUsername, createUser, createPost } = require('../db');

// notification middleware
usersRouter.use((req, res, next) => {
  console.log("A request is being made to /users");

  next();
});

// GET route to get all users
usersRouter.get('/', async (req, res) => {
    const users = await getAllUsers();

    res.send({
        users
    });
});

// POST route to login a user
usersRouter.post('/login', async (req, res, next) => {
    // destructure username & password from request body
    const { username, password } = req.body;

    // checks for missing fields
    if (!username || !password) {
      next({
        name: "MissingCredentialsError",
        message: "Please supply both a username and password"
      });
    }
  
    try {
      // gets user data by username
      const user = await getUserByUsername(username);
  
      // checks if password from body matches the user associated with the given username's password
      if (user && user.password == password) {
        // creates token for the logged in user and sends it
        const token = jwt.sign({ id: user.id, username }, JWT_SECRET);
        res.send({ message: "you're logged in!", token });
      } else {
        next({ 
          name: 'IncorrectCredentialsError', 
          message: 'Username or password is incorrect'
        });
      }
    } catch(error) {
      console.log(error);
      next(error);
    }
});

// POST route to register a new user
usersRouter.post('/register', async (req, res, next) => {
  // destructure required user data from request body
  const { username, password, name, location } = req.body;

  try {
    // checks to see if the username provided is already in use
    const _user = await getUserByUsername(username);

    if (_user) {
      next({
        name: 'UserExistsError',
        message: 'A user by that username already exists'
      });
    }

    // creates new user using provided data
    const user = await createUser({
      username,
      password,
      name,
      location,
    });

    // creates token for newly registered user and sends it
    const token = jwt.sign({ 
      id: user.id, 
      username
    }, process.env.JWT_SECRET, {
      expiresIn: '1w'
    });

    res.send({ 
      message: "thank you for signing up",
      token 
    });
  } catch ({ name, message }) {
    next({ name, message })
  } 
});

module.exports = usersRouter;