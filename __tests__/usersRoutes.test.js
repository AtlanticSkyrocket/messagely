const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");
const { SECRET_KEY } = require('../config');

let u1 = null;
let u2 = null;
let u1Token = null;
let u2token = null;
describe("User Routes Test", function () {

  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");
    await db.query("ALTER SEQUENCE messages_id_seq RESTART WITH 1");

    u1 = await User.register({
      username: "test1",
      password: "password",
      first_name: "Test1",
      last_name: "Testy1",
      phone: "+14155550000",
    });
    u1Token = jwt.sign({ username: "test1"}, SECRET_KEY);
    u2 = await User.register({
      username: "test2",
      password: "password2",
      first_name: "Test2",
      last_name: "Testy2",
      phone: "+14155550001",
    });
    u2Token = jwt.sign({ username: "test2"}, SECRET_KEY);

    let m1 = await Message.create({
      from_username: "test1",
      to_username: "test2",
      body: "u1-to-u2"
    });
    let m2 = await Message.create({
      from_username: "test2",
      to_username: "test1",
      body: "u2-to-u1"
    });
  });

  /** GET /users/ => {users: [{username, first_name, last_name, phone}, ...]}  */

  describe("GET /users/", function () {
    test("returns a 401 error", async function () {
      let response = await request(app)
        .get("/users/"); // no token being sent
      expect(response.statusCode).toBe(401);
    });
    
    test("returns a {users: [{username, first_name, last_name, phone}, ...]}", async function () {
      let response = await request(app)
        .get("/users/")
        .send({_token: u1Token});
        
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        users: expect.arrayContaining([
            expect.objectContaining({
                username: expect.any(String),
                first_name: expect.any(String),
                last_name: expect.any(String),
                phone: expect.any(String)
            })
        ])
      }))
    });
  });

  /** GET /users/:username => {user: {username, first_name, last_name, phone, join_at, last_login_at}}  */
  describe("GET /users/:username", function () {
    test("not authenticated returns a 401 error", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}`); // no token being sent
      expect(response.statusCode).toBe(401);
    });
    
    test("user can view own user details", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}`)
        .send({_token: u1Token});
        
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        user: 
          expect.objectContaining({
              username: expect.any(String),
              first_name: expect.any(String),
              last_name: expect.any(String),
              phone: expect.any(String),
              join_at: expect.any(String),
              last_login_at: null
          })
      }))
    });

    test("user can't view other users details", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}`)
        .send({_token: u2Token});
        
      expect(response.statusCode).toBe(401);
    });
  });

  /** GET /users/:username/to => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 from_user: {username, first_name, last_name, phone}}, ...]}
 **/
  describe("GET /users/:username/to", function () {
    test("not authenticated returns a 401 error", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}/to`); // no token being sent
      expect(response.statusCode).toBe(401);
    });
    
    test("user can view own user details", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}/to`)
        .send({_token: u1Token});
        
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        messages:  expect.arrayContaining([
          expect.objectContaining({
              id: expect.any(Number),
              body: expect.any(String),
              sent_at: expect.any(String),
              read_at: null,
              from_user:expect.objectContaining({
                username: expect.any(String),
                first_name: expect.any(String),
                last_name: expect.any(String),
                phone: expect.any(String)
              })
          })
        ])
      }))
    });

    test("user can't view other users to messages", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}/to`)
        .send({_token: u2Token});
        
      expect(response.statusCode).toBe(401);
    });
  });

  /** GET /:username/from - get messages from user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 to_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/
  describe("GET /users/:username/from", function () {
    test("not authenticated", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}/from`); // no token being sent
      expect(response.statusCode).toBe(401);
    });
    
    test("user can view own from messages", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}/from`)
        .send({_token: u1Token});
        
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        messages:  expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            body: expect.any(String),
            sent_at: expect.any(String),
            read_at: null,
            to_user: expect.objectContaining({
              username: expect.any(String),
              first_name: expect.any(String),
              last_name: expect.any(String),
              phone: expect.any(String)
            })
          })
        ])
      }));
    });

    test("user can't view other users from messages", async function () {
      let response = await request(app)
        .get(`/users/${u1.username}/from`)
        .send({_token: u2Token});
        
      expect(response.statusCode).toBe(401);
    });
  });
});

afterAll(async function () {
  await db.end();
});
