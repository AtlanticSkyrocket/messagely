/** User class for message.ly */
const { BCRYPT_WORK_FACTOR } = require('../config');
const db = require('../db');
const ExpressError = require('../expressError');
const { expressError } = require('../expressError');
const bcrypt = require('bcrypt');


/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {
    try {
      const hashedPwd = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
      const results = await db.query(`
        INSERT INTO users (username, password, first_name, last_name, phone, join_at)
        VALUES ($1, $2, $3, $4, $5, LOCALTIMESTAMP)
        RETURNING username, password, first_name, last_name, phone
      `, [username, hashedPwd, first_name, last_name, phone]);

      const userData = results.rows[0];

      return userData;
    } catch (err) {
      if (err.code === '23505') {
        throw new ExpressError("Username taken. Please pick another!", 400);
      }
      throw new ExpressError("There was an error while registering the account", 404);
    }
   }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 
    try {
      const results = await db.query(`
        SELECT password
        FROM users
        WHERE username = $1
      `, [username]);
      if(results.rows.length === 0)
        throw new ExpressError("Invalid user/password", 400);
      const user = results.rows[0];
      if (user) {
        if(await bcrypt.compare(password, user.password))
          return true;
        return false;
      }
      throw new ExpressError("Invalid user/password", 400);
    } catch (err) {
      if (err instanceof ExpressError) {
        throw err;
      }
      throw new ExpressError("There was an error authenticating", 404);
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) { 
    try {
      const results = db.query(`
        UPDATE users SET last_login_at=CURRENT_TIMESTAMP
        WHERE username = $1
      `, [username]);
      return true;
    } catch (err) {
      throw new ExpressError("There was an error updating login timestamp", 404)
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    try {
      const results = await db.query(`
        SELECT username, first_name, last_name, phone
        FROM users
      `);

      return results.rows;
    } catch (err) {
      throw new ExpressError("There was an error retrieving records", 400);
    }
   }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) { 
    try {
      const results = await db.query(`
        SELECT 
          username, first_name, last_name,
          phone, join_at, last_login_at
        FROM users
        WHERE username = $1
      `, [username]);
      if(results.rows.length === 0)
        return new ExpressError("There was an error getting user", 404);

      return results.rows[0];
    } catch (err) {
      throw new ExpressError("There was an error getting user", 400);
    }
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 
    try {
      const messageRes = await db.query(`
        SELECT 
          m.id, m.body, m.sent_at, 
          m.read_at, u.username, u.first_name,
          u.last_name, u.phone
        FROM messages m
        LEFT JOIN users u
        ON m.to_username = u.username
        WHERE m.from_username = $1
      `,[username]);
      if (messageRes.rows.length === 0)
        return [];

    const messages = messageRes.rows.map(
      ({ id, username, first_name, last_name, phone, body, sent_at, read_at}) => (
      { id, 
        to_user: { 
          username, 
          first_name, 
          last_name, 
          phone
        }, 
        body, 
        sent_at,
        read_at
      }));

    return messages;
    } catch (err) {
      console.log(err.message);
      throw new ExpressError("Error retrieving user messages", 400);
    }
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    try {
      const messageRes = await db.query(`
        SELECT 
          m.id, m.body, m.sent_at, 
          m.read_at, u.username, u.first_name,
          u.last_name, u.phone
        FROM messages m
        LEFT JOIN users u
        ON m.from_username = u.username
        WHERE m.to_username = $1
      `,[username]);
      if (messageRes.rows.length === 0)
        return [];

    const messages = messageRes.rows.map(({ id, username, first_name, last_name, phone, body, sent_at, read_at}) => ({ id, from_user: { username, first_name, last_name, phone}, body, sent_at, read_at}));

    return messages;
    } catch (err) {
      console.log(err.message);
      throw new ExpressError("Error retrieving user messages", 400);
    }
   }
}


module.exports = User;