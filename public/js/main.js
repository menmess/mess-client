// Client receive:
// + "require_registration",  нет аргументов, ожидается, что ответом будет "register"
// + "invalid_token",         нет аргументов, ожидается, что юзера попросят заново ввести токен
// "error_occured",                 аргумент: errorMessage: String
// "receive_message",       аргумент: message: JSON<Message>
// + "new_user",              ???, отправляется, когда к сети присоединяется юзер
// "add_chat",              ???, отправляется в ответ на "create_chat"
// "read_chat",             аргумент: chatId: Id, отправляется когда собеседник открыл чат и прочитал сообщения в нем, то есть нужно пометить сообщения в чате как прочитанные
// "offline_user",          аргумент: userId: Id, отправляется когда кто-то отключился из чата

// Client send:
// socket.emit('register',          info);
// socket.emit('read_messages',     chatId);
// socket.emit('send_message',      message);
// socket.emit('change_chat',       chatId);
// socket.emit('create_chat',       userId);

let socket = new WebSocket("wss://8080"); // io?

let my_id = 0;
let partner_id = 0;
let users = {}; // store users
let chats = {}; // store chats
let my_token = '';

// -----------------------------------------------------------------------------

socket.onopen = function(e) {
  alert('Have connection');
};

socket.onmessage = function(message) {
  let data = JSON.parse(message);
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
    case 'error_occured';
      ErrorOccured();
      break;
    default:
      break;
  }
};

socket.onclose = function(event) {

};

socket.onerror = function(error) {
  alert(`[error] ${error.message}`);
}

// -----------------------------------------------------------------------------


let ReceiveToken = function(token) {
  let token_field = $('#token');
  token_field.addClass(token);
  my_token = token;
};

let RequireRegistration = function(clientId) {
  let my_name = prompt('Enter usename:');
  changeChatHeader(name, 'Online');
  while(my_token === '') {
    continue;
  }
  my_id = clientId;
  partner_id = clientId;
  users.my_id = my_name;
  Register(my_name, token);
  // there may be some more checks for the validity of the username
  // usernames with ';' break logic of page
  // I'm not sure to check here or on the server
};

let InvalidToken = function() { 
  alert('Wrong token, please try again');
  while(my_token === '') {
    continue;
  }
  Register(users.my_id, token);
};

let ReceiveMessage = function(message) {
  // debuging
  alert(message);

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

let NewUser = function(user_data) {
  let data = JSON.parse(user_data);
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
  let unread_msgs = $('div.unread');
  unread_msgs.addClass('read');
  unread_msgs.removeClass('unread');
};

let ErrorOccured = function() {

};
// -----------------------------------------------------------------------------

let Register = function(name, token) {
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
      userId: userId
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
  socket.send(JSON.stringify({request : 'generate_token'}));
}
// -----------------------------------------------------------------------------

// ToDo: integrate message handling
$('#chat_form').submit(function(e) { // e?
  let message_input = $('#message_input');
  let attached_input = $('#attached_input');

  let text = message_input.val().replace(/\n/g, '<br/>');
  let message = {id:  + -1,
    authorId: my_Id,
    chatId: chats.partner_Id,
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
    my_token = $('#token_input');
  }
  return true;
});
