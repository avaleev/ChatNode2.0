function displayError(msg) {
    $("#errorbox").html("<i class='fas fa-exclamation-triangle'></i> " + msg);
    $("#errorbox").addClass("active");

    setTimeout(function(){
        $("#errorbox").removeClass("active");
        $("#errorbox").html('');
    }, 5000);
}

/*function displayError(msg) {
    $("#responsebox").html("<i class='fas fa-exclamation-triangle'></i> " + msg);
    $("#responsebox").addClass("active");
}*/


// enable sockets
var socket = io();

$(function(){
    $.get("/user/self?basic=true")
        .done(function(user) {
            socket.emit("user init", user);
        }).fail(function(err){
            console.log(err);
        });

    $(".menu-trigger").click(function(){
        if ($(".profile-dropdown").hasClass("active")){
            $(".profile-dropdown").removeClass("active");
            $(".menu-closer").remove();
        } else {
            $(".profile-dropdown").addClass("active");
            $("body").append("<div class='menu-closer'></div>");
        }
    });

    $("body").on("click", ".menu-closer", function(){
        $(".profile-dropdown").removeClass("active");
        $(".menu-closer").remove();
    });
});