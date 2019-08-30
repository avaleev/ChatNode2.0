var register = function(Handlebars) {
    var helpers = {
        isEven: function(iterator) {
            return (iterator % 2 === 0)? "even" : "uneven";
        },
        isSame: function(arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        },
        formatDate: function(date) {
            date = new Date(date);

            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const crtd = months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();

            return crtd;
        }
    };

    if (Handlebars && typeof Handlebars.registerHelper === "function") {
        for (var prop in helpers) {
            Handlebars.registerHelper(prop, helpers[prop]);
        }
    } else {
        return helpers;
    }
};

module.exports.register = register;
module.exports.helpers  = register(null);