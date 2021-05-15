var socket = io.connect('http://localhost:8080');
let username = ''
let partner = ''

socket.on('connect', function() {
    while (username == '') {
        username = prompt("What is your username?");
    }
    partner = username;
    $('input[name=username]').val(username);
    socket.emit('join', username)
});

socket.on('send message', function(message) {
    var data = JSON.parse(message);
    if (data.type == 'text') {
        $('.chat-body').append(msgFormat(data.username, data.message));
    } else if (data.type == 'img') {
        $('.chat-body').append(imgFormat(data.username, data.message));
    }
});

socket.on('add user', function(username) {
    $('#user_list').append("<button style='display:block;' id='" + username + "' onclick=changeChat('" + username + "')>" + username + "</button>");
    $('#user_list_online').append("<button style='display:block;' id='" + username + "' onclick=changeChat('" + username + "')>" + username + "</button>");
})

socket.on('remove user', function(username) {
    $('#user_list_online button#' + username).remove();
    $('#user_list button#' + username).remove();
});

$('#chat_form').submit(function(e) {
    var message = $('#message_input').val();
    var attached = $('#attached_input').val();
    if (message != '') {
        socket.emit('send message', message);
        $('#message_input').val('');
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

var changeChat = function(username) {
    $('.chat-body').empty();
    partner = username;
	console.log(username)
    socket.emit('change chat', username);
}

// Message format
var msgFormat = function(author, msg) {
    var content = "<div class='media'><div class='media-left'><span class='author'>" + author + "</span></div><div class='media-body'><span class='msg-body'>" + msg + "</span></div></div>";
    return content;
}

// Image format
var imgFormat = function(author, imgPath) {
    var content = "<div class='media'><div class='media-left'><span class='author'>" + author + "</span></div><div class='media-body'><img src='" + imgPath + "' height='150'></img></div></div>";
    return content;
}