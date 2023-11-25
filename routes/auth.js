const express = require('express');
const router = new express.Router();
const ExpressError = require('../expressError');
const User = require("../models/user");
const jwt = require ("jsonwebtoken");
const { SECRET_KEY, JWT_OPTIONS } = require("../config");
/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if(!username || !password)
      throw new ExpressError("Username and password required", 400)
    const isAuthed = await User.authenticate(username, password);
    if (isAuthed) {
      let updatedLastlogin = await User.updateLoginTimestamp(username);
      let payload = { username };
      let token = jwt.sign(payload, SECRET_KEY, JWT_OPTIONS);
      return res.json( { token } );
    }
    throw new ExpressError("Invalide username/password", 400);
  } catch (err) {
    return next(err);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post("/register", async (req, res, next) => {
  try {
    const { username, password, first_name, last_name, phone } = req.body;
    const user = await User.register({ username, password, first_name, last_name, phone });
    if (user) {
      const isAuthed = await User.authenticate(username, password);
      if (isAuthed) {
        await User.updateLoginTimestamp(username);
        let payload = { username }
        let token = jwt.sign(payload, SECRET_KEY, JWT_OPTIONS);
        return res.json( { token } );
      }
      throw new ExpressError("Invalid username/password", 400);
    }
    throw new ExpressError("Error creating user", 400);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;