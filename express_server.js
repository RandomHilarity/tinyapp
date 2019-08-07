const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080;

/* const isLoggedIn = function() {
  app.get(user_id, (response, request) => {
    if (!user_id) {
      let templateVars = {
        user: users[request.cookies["user_id"]]
      };
      response.render('login', templateVars);
    }
    response.render('login');
  });
}; */


const generateRandomString = function() {
  return Math.random().toString(36).split('').filter(function(value, index, self) {
    return self.indexOf(value) === index;
  }).join('').substr(2,6);
};

const emailExists = function(email, userObj) {
  for (let userID in userObj) {
    if (email === userObj[userID]["email"]) {
      return true;
    }
  }
  return false;
};

const urlIsForUser = function(id) {
  let userUrlObj = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url]["userID"] === id) {
      userUrlObj[url] = { "longurl": urlDatabase[url].longurl };
    }
  }
  return userUrlObj;
};

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
//app.use(isLoggedIn());

let urlDatabase = {
  "b2xVn2": { longurl: 'http://www.lighthouselabs.ca', userID: "userRandomID" },
  "9sm5xK": { longurl: 'http://www.google.com', userID: "user2RandomID" }
};

let users = {
  "userRandomID": {
    id: "userRandomID",
    email: "1@1.com",
    password: "password"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "2@2.com",
    password: "password"
  },
};

//ROOT path handler
app.get('/', (request, response) => {
  response.send('Hello!');
});

//clears cookies
app.post('/logout', (request, response) => {
  response.clearCookie("user_id");
  response.redirect("/urls");
});

// create new shortURL:longURL pair, random key
app.post('/urls', (request, response) => {
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = request.body["longURL"];
  response.redirect(`/urls/${shortURL}`);
});

//Displays all URLs owned by user
app.get('/urls', (request, response) => {
  let id = request.cookies["user_id"];
  let templateVars = {
    urls: urlIsForUser(id),
    user: users[id]
  };
  response.render('urls_index', templateVars);
});

app.get('/urls.json', (request, response) => {
  response.json(urlDatabase);
});

app.get('/urls/new', (request, response) => {
  let id = request.cookies["user_id"];
  if (!users[request.cookies["user_id"]]) {
    let templateVars = {
      user: users[request.cookies["user_id"]]
    };
    response.render('login', templateVars);
  }
  let templateVars = {
    urls: urlIsForUser(id),
    user: users[request.cookies["user_id"]]
  };
  response.render('urls_new', templateVars);
});

app.get('/urls/:shortURL', (request, response) => {
  let id = request.cookies["user_id"];
  let reqUrl = request.params.shortURL;
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

// DELETE - deletes short/long URL entry from urlDatabase object
app.post('/urls/:shortURL/delete', (request, response) => {
  let id = request.cookies["user_id"];
  let reqUrl = request.params.shortURL;
  if (id !== urlDatabase[reqUrl].userID) {
    response.status(403).send("shortURL not owned by user");
    return;
  }
  delete urlDatabase[request.params.shortURL];
  response.redirect('/urls');
});

app.get('/u/:shortURL', (request, response) => {
  let reqUrl = request.params.shortURL;
  const longURL = urlDatabase[reqUrl].longurl;
  response.redirect(longURL);
});

// EDIT - change longURL and redirect to URL list
app.post('/urls/:id', (request, response) => {
  let id = request.cookies["user_id"];
  let reqUrl = request.params.shortURL;
  if (id !== urlDatabase[reqUrl].userID) {
    response.status(403).send("shortURL not owned by user");
    return;
  }
  urlDatabase[request.params.id] = request.body["longURL"];
  response.redirect('/urls');
});

// USER LOGIN - Accept existing user email and password
app.post('/login', (request, response) => {
  let uEmail = request.body["email"];
  let uPass = request.body["password"];
  if (!emailExists(uEmail, users)) {
    response.status(403).send('Email does not exist, register or re-enter');
  }
  for (let userID in users) {
    if (uEmail === users[`${userID}`]["email"] && uPass !== users[`${userID}`]["password"]) {
      response.status(403).send("Incorrect password");
      return;
    }
    if (uEmail === users[`${userID}`]["email"] && uPass === users[`${userID}`]["password"]) {
      response.cookie('user_id', userID);
      return response.redirect('urls/');
    }
  }
  response.status(400).send('Email or password incorrect');
});

// USER LOGIN - goto login page
app.get('/login',(request, response) => {
  let templateVars = {
    user: users[request.cookies["user_id"]]
  };
  response.render('login', templateVars);
});

// USER REGISTRATION - Accept user email and password, and add to users object
app.post('/register', (request, response) => {
  if (!request.body["email"] || !request.body["password"]) {
    response.status(400).send('email or password not entered.');
    return;
  }
  if (emailExists(request.body["email"], users)) {
    response.status(400).send('Email already exists.');
    return;
  }
  
  let newID = generateRandomString();
  users[newID] = { id: newID,
    email: request.body["email"],
    password: request.body["password"]
  };
  response.cookie('user_id', newID);
  return response.redirect('urls/');
});

// USER REGISTRATION - Go to registration page
app.get('/register', (request, response) => {
  let templateVars = {
    user: users[request.cookies["user_id"]]
  };
  response.render('register', templateVars);
});

app.get('/hello', (request, response) => {
  response.send('<html><body>Hello <b>World</b></body></html>\n');
});

// CATCHALL - for random page requests goes back to index
app.get('*', (request, response) => {
  response.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});