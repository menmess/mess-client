let socket = new WebSocket('ws://localhost:8083/connection'); // io?

let my_id = '';
let partner_id = '';
let users = {}; // store users
let chats = {}; // store chats
let my_token = '';

// -----------------------------------------------------------------------------

socket.onopen = function(e) {
  console.log('Socket: open');
};

socket.onmessage = function(message) {
  let data = JSON.parse(message.data);
  console.log('Socket: receive message: ', data);
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
  console.log('Socket: close, ', event);
};

socket.onerror = function(error) {
  console.log('Socket: error, ', error);
  alert(`[error] ${error.message}`);
};

// -----------------------------------------------------------------------------

let ReceiveToken = function(token) {
  my_token = token;
  let width = 800;
  let height = 50;
  let left = (screen.width / 2) - (width / 2);
  let top = (screen.height / 2) - (height / 2);

  let tokenWindow = window.open(' ', 'Token',
      'left=' + left + ', top=' + top + ',width=' + width + ',height=' +
      height + '');

  tokenWindow.document.write('<title>' + 'Token' + '</title>');
  tokenWindow.document.write('<p>' + my_token + '</p>');
};

let RequireRegistration = function(clientId) {
  let my_name = prompt('Enter username:');
  changeChatHeader(my_name, 'Online');
  my_id = clientId.toString();
  partner_id = clientId;
  users[my_id] = my_name;
  registerToken();
  // there may be some more checks for the validity of the username
  // usernames with ';' break logic of page
  // I'm not sure to check here or on the server
};

let InvalidToken = function() {
  alert('Wrong token, please try again');
  registerToken();
};

let ReceiveMessage = function(message) {
  let data = JSON.parse(message);
  let user_list = $('#user_list');
  console.log(data);
  if (data.authorId.toString() !== partner_id && data.authorId.toString() !==
      my_id) {
    if (!user_list.find('#' + data.authorId.toString()).find('div').length) {
      user_list.find('#' + data.authorId.toString()).
          append('<div><span></span><i class=\'fa fa-envelope\'></i></div>');
    }
    return;
  }

  // if (data.type === 'text') {
  $('.discussion').
      append(
          msgFormat(users[data.authorId], data.text, data.status, data.sent));
  // } else if (data.type === 'img') {
  // $('.discussion').append(imgFormat(data.username, data.message));
  // }

  if (data.status !== 'READ' && data.authorId === partner_id) {
    socket.send(JSON.stringify({request: 'read_chat', chatId: data.chatId}));
  }
};

let NewUser = function(user) {
  let data = JSON.parse(user);
  console.log('New user: ', data);
  let str_id = data.id.toString();
  users[str_id] = data.username;
  $('#user_list_online').
      append('<div id=\'' + str_id +
          '\' class=\'center-block user-chat\'><button onclick=changeChat(\'' +
          str_id + '\') class=\'center-block username\'>' + data.username +
          '</button></div>');
  console.log('All users:', users);
};

let AddChat = function(userId, chatId) {
  let str_id = userId.toString();

  $('#user_list').append('<div id=\'' + str_id +
      '\' class=\'center-block user-chat\'><button onclick=changeChat(\'' +
      str_id + '\') class=\'center-block username\'>' + users[str_id] +
      '</button></div>');

  chats[str_id] = chatId;
  let name = users[str_id];
  changeChatHeader(name, 'Online');
};

let OfflineUser = function(userId) {
  $('#user_list_online #' + userId).remove();
};

let ReadChat = function(userId) { // username?
  if (userId.toString() === partner_id) {
    let unread_msgs = $('div.unread');
    unread_msgs.addClass('read');
    unread_msgs.removeClass('unread');
  }
};

let ErrorOccured = function(message) {
  alert('Error: ' + message);
};
// -----------------------------------------------------------------------------

let Register = function(name, token) {
  console.log('Register', name, my_id, token);
  socket.send(JSON.stringify({
    request: 'register',
    username: name,
    token: token,
  }));

  // customizing page data
  $('input[name=username]').val(name);
  $('input[name=partner]').val(name);
};

let changeChat = function(userId) {
  let str_id = userId.toString();
  let username = users[str_id];
  $('.discussion').empty();
  $('input[name=partner]').val(username);
  $('#user_list').find('#' + username).find('div').remove();

  partner_id = str_id;
  changeChatHeader(username, 'Online');
  if (partner_id in chats) {
    socket.send(JSON.stringify({
      request: 'change_chat',
      chatId: chats[partner_id],
    }));
  } else {
    socket.send(JSON.stringify({
      request: 'create_chat',
      userId: partner_id,
    }));
  }

  console.log('Сhange chat:', partner_id, users[partner_id]);
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
  if (author === users[my_id]) {
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
  console.log('Generate token.');
  socket.send(JSON.stringify({request: 'generate_token'}));
};

let registerToken = function() {
  let is_new_user = confirm('Do you want to create new netwotk?');
  if (is_new_user) {
    console.log('Create new net. ');
    Register(users[my_id], '');
  } else {
    my_token = prompt('Enter token');
    console.log('Get token: ', my_token);
    Register(users[my_id], my_token);
  }
};
// -----------------------------------------------------------------------------

// ToDo: integrate message handling
$('#chat_form').submit(function(e) { // e?
  let message_input = $('#message_input');
  let filename = $('#filename');

  let fullPath = filename.val()
  if (fullPath) {
    let startIndex = (fullPath.indexOf('\\') >= 0
        ? fullPath.lastIndexOf('\\')
        : fullPath.lastIndexOf('/'));
    let result = fullPath.substring(startIndex);
    if (result.indexOf('\\') === 0 || result.indexOf('/') === 0) {
      result = result.substring(1);
    }
    filename.val(result)
    alert(result);
  }

  let text = message_input.val().replace(/\n/g, '<br/>');
  let d = new Date();
  let data = {
    request: 'send_message',
    chatId: chats[partner_id],
    text: text,
    time: d.getTime(),
  };
  console.log('Sending message... ', data);
  if (text !== '') {
    message_input.val('');
    socket.send(JSON.stringify(data));
    console.log('Sent.');
    return false;
  }

  if (filename.val() === '') {
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
  filename.val('');
  return false;
});

$('#message_input').keyup(function(e) {
  if (e.keyCode === 13) {
    $('#chat_form').submit();
  }
  return true;
});