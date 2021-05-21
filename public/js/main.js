// global variables
var socket = io.connect('http://localhost:8080');
var username = ''
var partner = ''
var online_status = 'offline'

socket.on('connect', function() {
    // If you need something when connecting
    // Now all the logic is on the server 
});

socket.on('register a token', function(status) {
    if (status == 'Success') {
        online_status = 'online';
    } else if (status == 'Connection') {
        let token = prompt("Enter token:");
        socket.emit('register a token', token);
    }
});

socket.on('register a username', function(status) {
    // username cannot be 'Request'
    if (status == 'Request') {
        let nick = prompt("Enter nickname:");
        socket.emit('register a username', nick);
    } else {
        username = status;
        // customizing page data
        $('input[name=username]').val(username);
        $('input[name=partner]').val(username);
        changeChatHeader(username, 'Online');
        partner = username;
        // there may be some more checks for the validity of the username
        // usernames with ';' break logic of page
        // I'm not sure to check here or on the server
        socket.emit('join', username)
    }
});

socket.on('send message', function(message) {
    var data = JSON.parse(message);
	if (data.username != partner && data.username != username) {
        if (!$('#user_list').find('#' + data.username).find('div').length) {
		    $('#user_list').find('#' + data.username).append("<div><span></span><i class='fa fa-envelope'></i></div>");
        }
		return;
	}
    if (data.type == 'text') {
        $('.discussion').append(msgFormat(data.username, data.message, data.status, data.time));
    } else if (data.type == 'img') {
        $('.discussion').append(imgFormat(data.username, data.message));
    }
    if (data.status == 'unread' && data.username == partner) {
        socket.emit('read messages', username);
    }
});

socket.on('add user', function(username) {
    $('#user_list_online').append("<div id='" + username + "' class='center-block user_chat'><button onclick=changeChat('" + username + "') class='center-block username'>" + username + "</button></div>");
})

socket.on('add chat', function(username) {
    $('#user_list').append("<div id='" + username + "' class='center-block user_chat'><button onclick=changeChat('" + username + "') class='center-block username'>" + username + "</button></div>");
})

socket.on('remove user', function(username) {
    $('#user_list_online #' + username).remove();
});

socket.on('read messages', function(username) {
    let unread_msgs = $('div.unread');
    unread_msgs.addClass('read');
    unread_msgs.removeClass('unread');
});

// Handling message sending
$('#chat_form').submit(function(e) {
    var message = $('#message_input').val().replace(/\n/g, '<br/>');
    var attached = $('#attached_input').val();
		
    if (message != '') {
        $('#message_input').val('');
		socket.emit('send message', message);
    } else if (attached != '') {
        $("#status").empty().text("File is uploading...");
        $(this).ajaxSubmit({
            error: function(xhr) {
                status('Error: ' + xhr.status);
            },
            success: function(response) {
                $("#status").empty().text(response);
            }
        });
        $('#attached_input').val('');
    }
    return false;
});

$('#message_input').keyup(function(e){
    e = e || event;
    if (e.keyCode === 13 && !e.shiftKey) {
        $('#chat_form').submit();
    }
    return true;
   });

var changeChat = function(username) {
    $('.discussion').empty();
	$('input[name=partner]').val(username);
	$('#user_list').find('#' + username).find('div').remove();
    partner = username;
	changeChatHeader(username, 'Online');
    socket.emit('change chat', username);
}

var changeChatHeader = function(username, status) {
    $('#partner_name').text(username);
    if (status == 'Online') {
        $('#partner_status').removeClass('offline');
        $('#partner_status').addClass('online');
    } else {
        $('#partner_status').removeClass('online');
        $('#partner_status').addClass('offline');
    }
    $('#partner_status').text(status);
}

// Message format
var msgFormat = function(author, msg, status, time) {
    if (author == username) {
        var content = "<div class='bubble recipient first'><p>" + msg + "</p><div class='msg-status " + status + "'><em class='time'>" + time + "</em> <i class='fa fa-check'></i></div></div>";
    } else {
        var content = "<div class='bubble sender first'><p>" + msg + "</p><div class='msg-status'><em class='time'>" + time + "</em></div></div>";
    }
    return content;
}

// Image format
var imgFormat = function(author, imgPath) {
    var content = "<div class='media'><div class='media-left'><span class='author'>" + author + "</span></div><div class='media-body'><img src='" + imgPath + "' height='150'></img></div></div>";
    return content;
}
