const express = require('express');

// util function for middleware that requires a user for requests
const requireUser = (req, res, next) => {
    console.log(req.user)
    if (!req.user) {
      next({
        name: "MissingUserError",
        message: "You must be logged in to perform this action"
      });
    }
  
    next();
}

module.exports = {
    requireUser
}