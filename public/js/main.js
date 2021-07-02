let socket = new WebSocket('ws://' + location.host + '/connection');

let my_id = '';
let partner_id = '';
let users = {}; // store users
let online_users = {};
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
  ChangeChatHeader(my_name, 'Online');
  my_id = clientId.toString();
  partner_id = clientId;
  users[my_id] = my_name;
  online_users[my_id] = my_name;
  RegisterToken();
  // there may be some more checks for the validity of the username
  // usernames with ';' break logic of page
  // I'm not sure to check here or on the server
};

let InvalidToken = function() {
  alert('Wrong token, please try again');
  RegisterToken();
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

  $('.discussion').
      append(
          MsgFormat(users[data.authorId], data.text, data.status, data.sent));

  if (data.attachmentUrl !== null && data.attachmentUrl !== "null") {
    $('.discussion').append(ImgFormat(users[data.authorId], "/media/" + data.attachmentUrl))
  }


  if (data.status !== 'READ' && data.authorId.toString() === partner_id) {
    console.log("Sending read_messages");
    socket.send(JSON.stringify({request: 'read_messages', chatId: data.chatId}));
  }
};

let NewUser = function(user) {
  let data = JSON.parse(user);
  console.log('New user: ', data);
  let str_id = data.id.toString();
  users[str_id] = data.username;
  $('#user_list_online').
      append('<div id=\'' + str_id +
          '\' class=\'center-block user-chat\'><button onclick=ChangeChat(\'' +
          str_id + '\') class=\'center-block username\'>' + data.username +
          '</button></div>');
  online_users[str_id] = data.username;
  console.log('All users:', users);
};

let AddChat = function(userId, chatId) {
  let str_id = userId.toString();

  $('#user_list').append('<div id=\'' + str_id +
      '\' class=\'center-block user-chat\'><button onclick=ChangeChat(\'' +
      str_id + '\') class=\'center-block username\'>' + users[str_id] +
      '</button></div>');

  chats[str_id] = chatId;
  let name = users[str_id];
  ChangeChatHeader(name, 'Online');
};

let OfflineUser = function(userId) {
  $('#user_list_online #' + userId).remove();
  delete online_users[userId];
};

let ReadChat = function(userId) { // username?
    console.log('Reading chat...' + users[userId]);
    let unread_msgs = $('div.unread');
    unread_msgs.addClass('read');
    unread_msgs.removeClass('unread');
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

let ChangeChat = function(userId) {
  let str_id = userId.toString();
  let username = users[str_id];
  $('.discussion').empty();
  $('input[name=partner]').val(username);
  $('#user_list').find('#' + str_id).find('div').remove();

  partner_id = str_id;

  if (partner_id in online_users) {
      ChangeChatHeader(username, 'Online');
  } else {
      ChangeChatHeader(username, 'Offline');
  }
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

let ChangeChatHeader = function(username, status) {
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
let MsgFormat = function(author, msg, status, time) {
  let content;
  let real_status;
  if (status === 'READ') {
      real_status = 'read';
  } else {
      real_status = 'unread';
  }
  if (author === users[my_id]) {
    content = '<div class=\'bubble recipient first\'><p>' + msg +
        '</p><div class=\'msg-status ' + real_status + '\'><em class=\'time\'>' +
        time + '</em> <i class=\'fa fa-check\'></i></div></div>';
  } else {
    content = '<div class=\'bubble sender first\'><p>' + msg +
        '</p><div class=\'msg-status\'><em class=\'time\'>' + time +
        '</em></div></div>';
  }
  return content;
};

// Image format
let ImgFormat = function(author, imgPath) {
  if (author === users[my_id]) {
    return '<div class="bubble recipient first">'
        + '<div class=\'media\'>'
        + '<div class=\'media-body\'><img src=\'' + imgPath +
        '\' width=\'250\' alt="image"/></div></div></div>';
  } else {
    return '<div class="bubble sender first">'
        + '<div class=\'media\'>'
        + '<div class=\'media-body\'><img src=\'' + imgPath +
        '\' width=\'250\' alt="image"/></div></div></div>';
  }
};

let GenerateToken = function() {
  console.log('Generate token.');
  socket.send(JSON.stringify({request: 'generate_token'}));
};

let RegisterToken = function() {
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

const input = document.getElementById('attached_input');

async function uploadFile(file) {
  if (file == null) {
    return
  }

  let data = new FormData()
  data.append("file", file)
  data.append("name", file.name)

  console.log("Uploading file: ", file.name)
  try {
    let response = await fetch('/upload?filename=' + file.name, { // Your POST endpoint
      method: 'POST',
      body: data // This is your file object
    }).then(
        response => response.text()
    ).then(
        text => {
          if (text !== "OK") {
            throw "Server returned error: " + text
          }
          return text
        }
    );
  } catch (error) {
    console.log("File sending error: " + error)
    alert("Failed to load file " + file.name)
    return false
  }
  return true
}

// -----------------------------------------------------------------------------

async function sendMessage() {
  let message_input = $('#message_input');
  let attached_input = $('#attached_input');

  let text = message_input.val().replace(/\n/g, '<br/>');
  let d = new Date();
  let data = {
    request: 'send_message',
    chatId: chats[partner_id],
    text: text,
    time: d.getTime(),
    attachmentUrl: null
  };

  if (text !== '') {
    message_input.val('');
  }

  if (attached_input.val() !== '') {
    let is_uploaded = await uploadFile(input.files[0]);
    if (!is_uploaded) {
      return false;
    }
    data.attachmentUrl = input.files[0].name
    attached_input.val('');
  }

  console.log('Sending message... ', data);

  socket.send(JSON.stringify(data));
  console.log('Sent.');
  return true;
}

// ToDo: integrate message handling
$('#chat_form').submit(function(e) { // e?
  sendMessage().then(status => {
      if (!status) {
        console.log("Message was not sent")
      }
  });
  return false;
});

$('#message_input').keyup(function(e) {
  if (e.keyCode === 13) {
    $('#chat_form').submit();
  }
  return true;
});
