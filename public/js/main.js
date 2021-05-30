// Client receive:
// socket.on('connect', function() {});
// socket.on('require_token', function(status) {});
// socket.on('register_username', function(status) {});
// socket.on('receive_message', function(message) {});
// socket.on('add_user', function(username) {});
// socket.on('add_chat', function(username) {});
// socket.on('remove_user', function(username) {});
// socket.on('read_messages', function(username) {});

// Client send:
// socket.emit('register_token', token);
// socket.emit('register_username', nick);
// socket.emit('join', username);
// socket.emit('read_messages', username);
// socket.emit('send_message', message);
// socket.emit('change_chat', username);

let socket = io.connect('http://localhost:8080'); // io?
let username = '';
let partner = '';
// let online_status = 'offline';

socket.on('connect', function() {
  // If you need something when connecting
  // Now all the logic is on the server
});

socket.on('require_token', function(status) {
  // if (status === 'Success') {
  //   online_status = 'online';
  // } else
  if (status === 'Connection') {
    socket.emit('require_token', prompt('Enter token:'));
  }
});

socket.on('register_username', function(status) {
  // username cannot be 'Request'
  if (status === 'Request') {
    socket.emit('register_username', prompt('Enter nickname:'));
    return;
  }

  username = status;
  // customizing page data
  $('input[name=username]').val(username);
  $('input[name=partner]').val(username);
  changeChatHeader(username, 'Online');
  partner = username;
  // there may be some more checks for the validity of the username
  // usernames with ';' break logic of page
  // I'm not sure to check here or on the server
  socket.emit('join', username);
});

socket.on('receive_message', function(message) {
  let data = JSON.parse(message);
  let user_list = $('#user_list');

  if (data.username !== partner && data.username !== username) {
    if (!user_list.find('#' + data.username).find('div').length) {
      user_list.find('#' + data.username).
          append('<div><span></span><i class=\'fa fa-envelope\'></i></div>');
    }
    return;
  }

  if (data.type === 'text') {
    $('.discussion').
        append(msgFormat(data.username, data.message, data.status, data.time));
  } else if (data.type === 'img') {
    $('.discussion').append(imgFormat(data.username, data.message));
  }

  if (data.status === 'unread' && data.username === partner) {
    socket.emit('read_messages', username);
  }
});

socket.on('add_user', function(username) {
  $('#user_list_online').
      append('<div id=\'' + username +
          '\' class=\'center-block user-chat\'><button onclick=changeChat(\'' +
          username + '\') class=\'center-block username\'>' + username +
          '</button></div>');
});

socket.on('add_chat', function(username) {
  $('#user_list').
      append('<div id=\'' + username +
          '\' class=\'center-block user-chat\'><button onclick=changeChat(\'' +
          username + '\') class=\'center-block username\'>' + username +
          '</button></div>');
});

socket.on('remove_user', function(username) {
  $('#user_list_online #' + username).remove();
});

socket.on('read_messages', function(username) { // username?
  let unread_msgs = $('div.unread');
  unread_msgs.addClass('read');
  unread_msgs.removeClass('unread');
});

// ToDo: integrate message handling
$('#chat_form').submit(function(e) { // e?
  let message_input = $('#message_input');
  let attached_input = $('#attached_input');

  let text = message_input.val().replace(/\n/g, '<br/>');
  let message = "{id: " + id +
      ", authorId: " + authorId +
      ", chatId: " + Id +
      ", sent: " + time +
      ", status: " + status +
      ", mediaId: " + Id +
      ", text: "+ text + "}"

  if (message !== '') {
    message_input.val('');
    socket.emit('receive_message', message);

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

let changeChat = function(username) {
  $('.discussion').empty();
  $('input[name=partner]').val(username);
  $('#user_list').find('#' + username).find('div').remove();

  partner = username;
  changeChatHeader(username, 'Online');
  socket.emit('change chat', username);
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
let msgFormat = function(
    id, authorId, chatId, comment, time, status, mediaId, text) {
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
