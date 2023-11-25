const express = require('express');
const { ensureLoggedIn } = require('../middleware/auth');
const router = new express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/message');
const ExpressError = require('../expressError');

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
  try {
    const id = req.params.id;
    const token = jwt.decode(req.body._token);
    const username = token.username;
    const message = await Message.get(id);
    if (message.from_user.username === username || message.to_user.username === username) {
      return res.json({ message });
    }
    throw new ExpressError("Not authorized", 400);
  } catch (err) {
    return next(err);
  }
})

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async (req, res, next) => {
  try {
    const token = jwt.decode(req.body._token);
    const from_username = token.username;
    const { to_username, body } = req.body;
    const message = await Message.create({from_username, to_username, body});
    return res.json({ message });
  } catch (err) {
    return next(err);
  }
})

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async (req, res, next) => {
  try {
    const id = req.params.id;
    const token = jwt.decode(req.body._token);
    const to_username = token.username;
    const m = await Message.get(id);
    if (m.to_user.username === to_username) {
      const message = await Message.markRead(id);
      return res.json({ message });
    }
    throw new ExpressError("Not authorized", 400);
  } catch (err) {
    return next(err);
  }
})

module.exports = router;