$(function(){
    const chat = window.location.pathname.split('/')[2];
    const type = window.location.pathname.split('/')[1];

    $.get("/messages?c=" + chat + "&t=" + type)
        .done(function(data) {
            for (var i = 0; i < data.length; ++i) {
                var chatBubble = '';

                if (data[i].self) {
                    chatBubble += "<li class='chat-bubble from-self'>";
                    chatBubble += data[i].message + "</li>";
                } else if (data[i].sender == "System") {
                    chatBubble += "<li class='chat-bubble from-system'>";
                    chatBubble += data[i].message + "</li>";
                } else {
                    chatBubble += "<li class='chat-bubble'>";
                    chatBubble += "<span class='sender'><div class='avatar-image' style='background-image: url(/external/images/" + data[i].sender.avatar + ")'></div><span>" + data[i].sender.name + "</span></span>";
                    chatBubble += data[i].message + "</li>";
                }

                $(".messages").append(chatBubble);
            }
        })
        .fail(function(err) {
            console.log(err);
        });

    // socket messaging
    // var socket = io(); defined in universal.js
    
    $("#chatnode").submit(function(e) {
        e.preventDefault();

        var chatBubble = '';
            chatBubble += "<li class='chat-bubble from-self'>";
            chatBubble += $("#message").val() + "</li>";

        const message = {
            chat: chat,
            roomtype: type,
            message: $("#message").val()
        }

        $.post("/message", message)
            .done(function(){
                socket.emit("chat message", $("#message").val());
                $("#message").val('');

                $(".messages").append(chatBubble);
            })
            .fail(function(){
                displayError("Could not send message. Please try again.");
            });

        return false;
    });

    socket.on("chat message", function(sender, msg) {
        var chatBubble = '';
            chatBubble += "<li class='chat-bubble'>";
            chatBubble += "<span class='sender'><div class='avatar-image' style='background-image: url(/external/images/" + sender.avatar + ")'></div><span>" + sender.name + "</span></span>";
            chatBubble += msg + "</li>";

        $(".messages").append(chatBubble);
    });

});