const express = require('express'); // express module
const app = express(); // initialize express app
const server = require('http').createServer(app); // create http server
const io = require('socket.io')(server); // using socket.io in server
const formidable = require('formidable'); // file upload module

// Variables
let usernames = []; // store users
let chats = {}; // store chats

// Static file configuration
app.use(express.static('public/js'));
app.use(express.static('public/css'));
app.use(express.static('public/uploads'));

// Server listen on port 8080
server.listen(8080);

// On client connect
io.on('connection', function(socket) {
  console.log('Client connected...');
  // Connect to the network
  socket.emit('register a token', 'Connection');

  // Sent/Receive chat messages
  socket.on('send message', function(message) {
    if (!chats.hasOwnProperty(simpleKey(socket.username, socket.partner))) {
      chats[simpleKey(socket.username, socket.partner)] = [];
      socket.emit('add chat', socket.partner);
      socket.to(socket.partner).emit('add chat', socket.username);
    }

    let username = socket.username;
    let d = new Date;
    let msgContent = {
      username: username,
      type: 'text',
      message: message,
      status: 'unread',
      time: d.getHours().toString() + ':' + d.getMinutes().toString(),
    };

    socket.emit('send message', JSON.stringify(msgContent));
    socket.to(socket.partner).emit('send message', JSON.stringify(msgContent));
    storeMsg(msgContent, username, socket.partner);
  });

  // Assign username value
  socket.on('join', function(username) {
    socket.username = username;
    socket.partner = username;
    // Enter own room
    socket.join(username);
    // To draw on the user page
    socket.emit('add user', username);
    socket.emit('add chat', username);
    // To draw on the page of other users
    socket.broadcast.emit('add user', username);
    // Server data
    chats[simpleKey(socket.username, socket.partner)] = [];
    storeUser(username);
  });

  socket.on('register a token', function(token) {
    // dummy processing
    socket.emit('register a token', 'Success');
    // Register name
    socket.emit('register a username', 'Request');
  });

  socket.on('register a username', function(username) {
    if (username != null && username !== '' && username.indexOf(';') === -1) {
      socket.emit('register a username', username);
      // Send usernames
      usernames.forEach(function(username) {
        socket.emit('add user', username);
      });
    } else {
      socket.emit('register a username', 'Request');
    }
  });

  // Show messages of only one user
  socket.on('change chat', function(username) {
    socket.partner = username;
    if (!chats.hasOwnProperty(simpleKey(socket.username, socket.partner))) {
      chats[simpleKey(socket.username, socket.partner)] = [];
      socket.emit('add chat', socket.partner);
      socket.to(socket.partner).emit('add chat', socket.username);
    }
    chats[simpleKey(socket.username, socket.partner)].forEach(
        function(msgContent) {
          socket.emit('send message', JSON.stringify(msgContent));
        });
  });

  socket.on('read messages', function(username) {
    // there is a synchronization flaw, at first several "unread" messages are sent and it is
    // entered here several times, in vain sending sockets
    chats[simpleKey(socket.username, socket.partner)].forEach(
        function(msgContent) {
          if (socket.partner === msgContent.username &&
              msgContent.status === 'unread') {
            msgContent.status = 'read';
            is_smth_chage = 1;
          }
        });
    if (socket.partner === socket.username) {
      socket.emit('read messages', socket.username);
    } else {
      socket.to(socket.partner).emit('read messages', socket.username);
    }
  });

  // Remove user when disconnect
  socket.on('disconnect', function() {
    socket.emit('remove user', socket.username);
    socket.broadcast.emit('remove user', socket.username);
    removeUser(socket.username);
  });

});

// Connect to index.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/public/index.html');
});

// Upload
app.post('/api/uploadImage', function(req, res) {
  let imgdatetimenow = Date.now();
  let form = new formidable.IncomingForm({
    uploadDir: __dirname + '/public/uploads',
    keepExtensions: true,
  });

  form.on('end', function() {
    res.end();
  });

  form.parse(req, function(err, fields, files) {
    let data = {
      username: fields.username,
      serverfilename: baseName(files.attached.path),
      filename: files.attached.name,
      size: bytesToSize(files.attached.size),
    };
    let d = new Date;
    let msgContent = {
      username: fields.username,
      type: 'img',
      message: data.serverfilename,
      status: 'unread',
      time: d.getHours().toString() + ':' + d.getMinutes().toString(),
    };

    io.sockets.emit('send message', JSON.stringify(msgContent));
    storeMsg(msgContent, fields.username, fields.partner);
  });
});

// Store chat history
let storeMsg = function(msgContent, username, partner) {
  chats[simpleKey(username, partner)].push(msgContent);
};

// Simple key for chats by two users
let simpleKey = function(user1, user2) {
  if (user1 > user2) {
    return user1 + '_to_' + user2;
  } else {
    return user2 + '_to_' + user1;
  }
};

// Store user
let storeUser = function(username) {
  usernames.push(username);
};

// Remove user
let removeUser = function(username) {
  for (let i = 0; i < usernames.length; i++) {
    if (usernames[i] === username) {
      usernames.splice(i, 1);
      break;
    }
  }
};

// Size Conversion
function bytesToSize(bytes) {
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  if (bytes === 0) {
    return 'n/a';
  }

  let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

  if (i === 0) {
    return bytes + ' ' + sizes[i];
  }

  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

//get file name from server file path
function baseName(str) {
  return String(str).substring(str.lastIndexOf('/') + 1);
}
