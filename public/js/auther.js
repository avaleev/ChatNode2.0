$(function(){
    $("form#signinnode").submit(function(e){
        e.preventDefault();

        const data = {
            login: $("input#login").val(),
            password: $("input#password").val()
        }

        $.post("/user/authenticate", data)
            .done(function(response) {
                window.location.replace("/conversations");
            })
            .fail(function(err) {
                displayError(err.responseText);
            });

        return false;
    });

    $("form#signupnode").submit(function(e){
        e.preventDefault();

        if ($("input#password").val() !== $("input#passwordVerify").val()) {
            displayError("You got typing problem? Check your passwords once again");
        } else {
            const data = {
                username: $("input#username").val(),
                email: $("input#email").val(),
                password: $("input#password").val()
            }

            $.post("/user/register", data)
                .done(function() {
                    window.location.replace("/user/self");
                })
                .fail(function(err) {
                    displayError(err.responseText);
                });
        }

        return false;
    });

    $("form#resetmypass").submit(function(e){
        e.preventDefault();

        data = {
            email: $("input#email").val()
        }

        $.post("/user/forgot", data)
            .done(function(data) {
                displayResponse(data.responseText);
            })
            .fail(function(err) {
                displayError(err.responseText);
            });

        return false;
    });
});