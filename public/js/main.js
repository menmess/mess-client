let socket = new WebSocket("ws://localhost:8081/connection"); // io?

let my_id = 0;
let partner_id = 0;
let users = {}; // store users
let chats = {}; // store chats
let my_token = '';

// -----------------------------------------------------------------------------

socket.onopen = function(e) {
  console.log("Socket: open");
};

socket.onmessage = function(message) {  
  let data = JSON.parse(message.data);
  console.log("Socket: receive message: ", data);
  switch (data.request) {
    case 'receive_token':
      ReceiveToken(data.token);
      break;
    case 'require_registration':
      RequireRegistration(data.clientId);
      break;
    case 'invalid_token':
      InvalidToken();
      break;
    case 'receive_message':
      ReceiveMessage(data.message);
      break;
    case 'new_user':
      NewUser(data.user);
      break;
    case 'add_chat':
      AddChat(data.memberId, data.chatId);
      break;
    case 'offline_user':
      OfflineUser(data.userId);
      break;
    case 'error_occured':
      ErrorOccured(data.message);
      break;
    case 'read_chat':
      ReadChat(data.memberId);
      break;
    default:
      break;
  }
};

socket.onclose = function(event) {
  console.log("Socket: close, ", event);
};

socket.onerror = function(error) {
  console.log("Socket: error, ", error);
  alert(`[error] ${error.message}`);
}

// -----------------------------------------------------------------------------


let ReceiveToken = function(token) {
  my_token = token;
  $('#token').addClass(token);
  $('#token').text(token);
};

let RequireRegistration = function(clientId) {
  let my_name = prompt('Enter usename:');
  changeChatHeader(my_name, 'Online');
  my_id = clientId;
  partner_id = clientId;
  users.my_id = my_name;
  // there may be some more checks for the validity of the username
  // usernames with ';' break logic of page
  // I'm not sure to check here or on the server
};

let InvalidToken = function() { 
  alert('Wrong token, please try again');
};

let ReceiveMessage = function(message) {
  let data = JSON.parse(message);
  let user_list = $('#user_list');

  if (data.authorId !== partner_id && data.authorId !== users.my_id) {
    if (!user_list.find('#' + data.authorId).find('div').length) {
      user_list.find('#' + data.authorId).
          append('<div><span></span><i class=\'fa fa-envelope\'></i></div>');
    }
    return;
  }

  // if (data.type === 'text') {
    $('.discussion').
        append(msgFormat(data.username, data.message, data.status, data.time));
  // } else if (data.type === 'img') {
    // $('.discussion').append(imgFormat(data.username, data.message));
  // }

  if (data.status === 'unread' && data.authorId === partner_id) {
    socket.send(JSON.stringify({request : 'read_chat', chatId : data.chatId}));
  }
};

let NewUser = function(user) {
  let data = JSON.parse(user);
  console.log("New user: ", data);
  $('#user_list_online').
      append('<div id=\'' + data.id +
          '\' class=\'center-block user-chat\'><button onclick=changeChat(\'' +
          data.id + '\') class=\'center-block username\'>' + data.username +
          '</button></div>');
  let curr_id = data.id;
  users.curr_id = data.username;
};

let AddChat = function(userId, chatId) {
  $('#user_list').append('<div id=\'' + userId +
          '\' class=\'center-block user-chat\'><button onclick=changeChat(\'' +
          userId  + '\') class=\'center-block username\'>' + users.userId + '</button></div>');
  chats.userId = chatId;
  let name = users.userId;
  changeChatHeader(name, 'Online');
};

let OfflineUser = function(userId) {
  $('#user_list_online #' + userId).remove();
};

let ReadChat = function(userId) { // username?
  if (userId === partner_id) {
    let unread_msgs = $('div.unread');
    unread_msgs.addClass('read');
    unread_msgs.removeClass('unread');
  }
};

let ErrorOccured = function(message) {
  alert("Error: " + message);
};
// -----------------------------------------------------------------------------

let Register = function(name, token) {
  console.log("Register", name, my_id, token);
  socket.send(JSON.stringify({
    request: 'register',
    username: name,
    token: token,
  }));
   
  // customizing page data
  $('input[name=username]').val(name);
  $('input[name=partner]').val(name);
}

let changeChat = function(userId) {
  let username = users.userId;
  console.log("Сhange chat:", userId, username);
  $('.discussion').empty();
  $('input[name=partner]').val(username);
  $('#user_list').find('#' + username).find('div').remove();

  partner_id = userId;
  changeChatHeader(username, 'Online');
  if (userId in chats) {
    socket.send(JSON.stringify({
      request:'change_chat', 
      chatId: chats.userId
    }));
  } else {
    socket.send(JSON.stringify({
      request:'create_chat', 
      userId: partner_id,
    }));
  }
};

let changeChatHeader = function(username, status) {
  let partner_status = $('#partner_status');
  $('#partner_name').text(username);

  if (status === 'Online') {
    partner_status.removeClass('offline');
    partner_status.addClass('online');
  } else {
    partner_status.removeClass('online');
    partner_status.addClass('offline');
  }

  partner_status.text(status);
};

// ToDo: integrate message format
let msgFormat = function(author, msg, status, time) {
  let content;
  if (author === username) {
    content = '<div class=\'bubble recipient first\'><p>' + msg +
        '</p><div class=\'msg-status ' + status + '\'><em class=\'time\'>' +
        time + '</em> <i class=\'fa fa-check\'></i></div></div>';
  } else {
    content = '<div class=\'bubble sender first\'><p>' + msg +
        '</p><div class=\'msg-status\'><em class=\'time\'>' + time +
        '</em></div></div>';
  }
  return content;
};

// Image format
let imgFormat = function(author, imgPath) {
  return '<div class=\'media\'><div class=\'media-left\'><span class=\'author\'>' +
      author + '</span></div><div class=\'media-body\'><img src=\'' + imgPath +
      '\' height=\'150\' alt="image"/></div></div>';
};

let generateToken = function() {
  console.log("Generate token.");
  socket.send(JSON.stringify({request : 'generate_token'}));
}

let createNewNet = function () {
  console.log("Create new net. ");
  Register(users.my_id, "");
}

// -----------------------------------------------------------------------------

// ToDo: integrate message handling
$('#chat_form').submit(function(e) { // e?
  let message_input = $('#message_input');
  let attached_input = $('#attached_input');

  let text = message_input.val().replace(/\n/g, '<br/>');
  let message = {id:  + -1,
    authorId: my_id,
    chatId: chats.partner_id,
    sent: -1,
    status: "unread",
    mediaId: -1,
    text: text
  };
  let data = {
    request: 'send_message',
    message: message
  };
  if (text !== '') {
    message_input.val('');
    socket.send(JSON.stringify(data));
    return false;
  }

  if (attached_input.val() === '') {
    return false;
  }

  $('#status').empty().text('File is uploading...');
  $(this).ajaxSubmit({
    error: function(xhr) { // error?
      status('Error: ' + xhr.status); // status?
    },
    success: function(response) { // success?
      $('#status').empty().text(response);
    },
  });
  attached_input.val('');

  return false;
});

$('#message_input').keyup(function(e) {
  if (e.keyCode === 13) {
    $('#chat_form').submit();
  }
  return true;
});

$('#token_input').keyup(function(e) {
  if (e.keyCode === 13) {
    my_token = $('#token_input').val();
    console.log("Get token: ", my_token);
    Register(users.my_id, my_token);
  }
  return true;
});
