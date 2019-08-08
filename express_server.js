//CONSTANTS W/ REQUIRES

const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const app = express();
const bcrypt = require('bcrypt');
const PORT = 8080;

const helpers = require('./helpers');
const generateRandomString = helpers.generateRandomString;
const getUserByEmail = helpers.getUserByEmail;
const urlIsForUser = helpers.urlIsForUser;

//SET USE and LISTEN

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', `key2`]
}));

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

//TESTING ACCOUNTS AND DATA OBJECTS

let urlDatabase = {
  "b2xVn2": { longurl: 'http://www.lighthouselabs.ca', userID: "7bwcl5" },
  "9sm5xK": { longurl: 'http://www.google.com', userID: "gqe7hr" }
};

//unhashed PW for both test accounts is password
let users = {
  "7bwcl5": {
    id: "7bwcl5",
    email: "1@1.com",
    password: "$2b$10$t0CtHP4/uEVkDyF1wktgYe.IZPFhpTp60gxlOAcgy6leVt6W6rAe6"
  },
  "gqe7hr": {
    id: "gqe7hr",
    email: "2@2.com",
    password: "$2b$10$YOI.Y10.NFs1Pd6aXpcv1Oq11Xl/12PTnVQPU.Lw9/Fa.iG0A.dvC"
  },
};

//////////////////////////
//     GET AND POST     //  **sorted by behavior requirements outline
//////////////////////////

//ROOT path handler - GOTO login/ if not logged in, GOTO urls/ if logged in
app.get('/', (request, response) => {
  let id = request.session["user_id"];
  if (!users[id]) {
    response.redirect('login');
    return;
  }
  response.redirect('/urls');
});

//Displays all URLs owned by user, error if not logged in
app.get('/urls', (request, response) => {
  let id = request.session["user_id"];
  if (!users[id]) {
    response.status(403).send("You must be logged in");
    return;
  }
  let templateVars = {
    user: users[id],
    urls: urlIsForUser(id, urlDatabase),
  };
  response.render('urls_index', templateVars);
});

// GOTO new_URLs page, goes to login if user not logged in, only user URLs
app.get('/urls_new', (request, response) => {
  let id = request.session["user_id"];
  if (!users[id]) {
    response.status(403).send("You must be logged in");
    return;
  }
  let templateVars = {
    urls: urlIsForUser(id, urlDatabase),
    user: users[id]
  };
  response.render('urls_new', templateVars);
});

// GOTO shortURL page if owned by user, error if not owned/logged/shortURL doesn't exist
app.get('/urls/:shortURL', (request, response) => {
  let id = request.session["user_id"];
  let reqUrl = request.params.shortURL;
  if (!(reqUrl in urlDatabase)) {
    response.status(403).send("shortURL does not exist");
    return;
  }
  if (!users[id]) {
    response.status(403).send("You must be logged in");
    return;
  }
  if (id !== urlDatabase[reqUrl].userID) {
    response.status(403).send("shortURL not owned by user");
    return;
  }
  let templateVars = {
    shortURL: reqUrl,
    longURL: urlDatabase[reqUrl],
    user: users[id]
  };
  response.render('urls_show', templateVars);
});

// GOTO shortURL link on web, universally accessible
app.get('/u/:shortURL', (request, response) => {
  let reqUrl = request.params.shortURL;
  if (!(reqUrl in urlDatabase)) {
    response.status(403).send("shortURL does not exist");
    return;
  }
  const longURL = urlDatabase[reqUrl].longurl;
  response.redirect(longURL);
  return;
});

// create new shortURL:longURL pair, random key, associated to user logged in
app.post('/urls_new', (request, response) => {
  let id = request.session["user_id"];
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    "longurl": request.body["longURL"],
    "userID": id
  };
  response.redirect(`/urls/${shortURL}`);
});

// EDIT - change longURL and redirect to URL list
app.post('/urls/:id', (request, response) => {
  let id = request.session["user_id"];
  let reqUrl = request.params.id;
  if (id !== urlDatabase[reqUrl].userID) {
    response.status(403).send("shortURL not owned by user");
    return;
  }
  urlDatabase[reqUrl].longurl = request.body["longURL"];
  response.redirect('/urls');
});

// DELETE - deletes short/long URL entry from urlDatabase object, check if logged in/owner
app.post('/urls/:shortURL/delete', (request, response) => {
  let id = request.session["user_id"];
  let reqUrl = request.params.shortURL;
  if (id !== urlDatabase[reqUrl].userID) {
    response.status(403).send("shortURL not owned by user");
    return;
  }
  delete urlDatabase[request.params.shortURL];
  response.redirect('/urls');
});

// USER LOGIN - goto login page
app.get('/login',(request, response) => {
  let id = request.session["user_id"];
  let templateVars = {
    user: users[id]
  };
  if (users[id]) {
    response.redirect('/urls');
    return;
  }
  response.render('login', templateVars);
});

// USER REGISTRATION - Go to registration page
app.get('/register', (request, response) => {
  let id = request.session["user_id"];
  let templateVars = {
    user: users[id]
  };
  if (users[id]) {
    response.redirect('/urls');
    return;
  }
  response.render('register', templateVars);
});

// USER LOGIN - Accept existing user email and password
app.post('/login', (request, response) => {
  let uEmail = request.body["email"];
  let uPass = request.body["password"];
  if (getUserByEmail(uEmail, users) === undefined) {
    response.status(403).send('Email does not exist, register or re-enter');
    return;
  }
  for (let userID in users) {
    let pwMatch = bcrypt.compareSync(uPass, users[`${userID}`]["password"]);
    if (uEmail === users[`${userID}`]["email"] && !pwMatch) {
      response.status(403).send("Incorrect password");
      return;
    }
    if (uEmail === users[`${userID}`]["email"] && pwMatch) {
      request.session['user_id'] = userID;
      response.redirect('urls/');
    }
  }
});

// USER REGISTRATION - Accept user email and password, and add to users object
app.post('/register', (request, response) => {
  if (!request.body["email"] || !request.body["password"]) {
    response.status(400).send('email or password not entered.');
    return;
  }
  if (getUserByEmail(request.body["email"], users) !== undefined) {
    response.status(400).send('Email already exists.');
    return;
  }
  let newID = generateRandomString();
  let hashPW = bcrypt.hashSync(request.body["password"], 10);
  users[newID] = {
    id: newID,
    email: request.body["email"],
    password: hashPW
  };
  request.session['user_id'] = newID;
  response.redirect('urls/');
});

//LOGOUT - clears cookies
app.post('/logout', (request, response) => {
  request.session = null;
  response.redirect("/urls");
});

// CATCHALL - for non-existing page requests goes back to index
app.get('*', (request, response) => {
  response.redirect('/urls');
});