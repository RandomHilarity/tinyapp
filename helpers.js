//searches for user by email, returns user if found, undefined if not found
const getUserByEmail = function(email, userObj) {
  for (let userID in userObj) {
    if (email === userObj[userID]["email"]) {
      return userID;
    }
  }
};

//generates random 6-character string
const generateRandomString = function() {
  return Math.random().toString(36).split('').filter(function(value, index, self) {
    return self.indexOf(value) === index;
  }).join('').substr(2,6);
};

//returns filtered object of urls registered to specific user from urlDatabase
const urlIsForUser = function(id, allUrlObj) {
  let userUrlObj = {};
  for (let url in allUrlObj) {
    if (allUrlObj[url]["userID"] === id) {
      userUrlObj[url] = { "longurl": allUrlObj[url].longurl };
    }
  }
  return userUrlObj;
};

module.exports = {
  getUserByEmail,
  generateRandomString,
  urlIsForUser };