"use strict"

const config       = require("config");
const express      = require("express");
const session      = require("express-session");
const bodyParser   = require("body-parser");
const cookieParser = require("cookie-parser");
const mongoose     = require("mongoose");
const MongoStore   = require("connect-mongo")(session);

const logger     = require("morgan");
const helmet     = require("helmet");
const exphbs     = require("express-handlebars");

const users  = require("./routes/user");
const index  = require("./routes/index");

const app  = express();
const http = require("http").Server(app);
const io   = require("socket.io")(http);

if (!config.get("encryptionstring") ||
    !config.get("sessionkey")) {
        throw Error("FATAL ERROR! I've lost my keys, how am I gonna open this page now?")
        process.exit(1);
}

const mongoURI = "mongodb+srv://chatuser:chatpass@akumacloud-r2091.mongodb.net/ChatNode?retryWrites=true&w=majority";
mongoose
    .connect(mongoURI, { useNewUrlParser: true, useCreateIndex: true })
    .then((data) => console.log("MongoDB connection established"))
    .catch(err => console.error("Could not connect to MongoDB " + err));

// view engine setup
app.engine(".hbs", exphbs({
    defaultLayout: "main",
    extname: ".hbs",
    helpers: require("./public/js/helpers.js").helpers,
    partialsDir: "views/partials/",
    layoutsDir: "views/layouts/"
}));
app.set("views", __dirname + "/views");
app.set("view engine", ".hbs");

// fire in the hole
app.use(helmet());
app.disable("x-powered-by");
app.use(logger("dev"));
// managing forms
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
    name: "ChatNodeSession",
    secret: config.get("sessionkey"),
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    }),
    cookie: { path: '/', maxAge: (60 * 60 * 1000), httpOnly: true }
}));
// static files directory setup
app.use(express.static(__dirname + "/public"));


// routes init
app.get('/', (req, res) => {
    if (req.session.token) {
        res.redirect("/conversations");
    } else {
        res.render("signin", {
            title: "CN.Sign_In",
            script: "auther"
        });
    }
});

app.get("/signup", (req, res) => {
    if (req.session.token) {
        res.redirect("/conversations");
    } else {
        res.render("signup", {
            title: "CN.Sign_Up",
            script: "auther"
        });
    }
});

app.use("/", index);
app.use("/user", users);

app.get("/favicon.ico", (req, res) => {
    res.sendStatus(204);
});


// sockets
io.on("connection", function(socket) {
    console.log("A new soul has stepped upon this wicked ground");

    socket.on("disconnect", function() {
        console.log("A soul has left the cursed lands of our lair");
    });

    socket.on("user init", function(user) {
        socket.user = user;
        console.log("A soul got a name, and the name is " + socket.user.name);
    });

    socket.on("chat message", function(msg) {
        socket.broadcast.emit("chat message", socket.user, msg);
    });
});


// error handling
app.get("/fehler", (req, res, next) => {
    res.json({message: "Ein Fehler ist aufgetreten"});
});

app.use((req, res, next) => {
    let err = new Error("Not Found");
        err.status = 404;
        next(err);
});

app.use((err, req, res, next) => {
    var message = '';
    var kao = '';
    console.log(err);
    switch(err.status) {
        case 404:
            message = "Hey buddy, I think you've got the wrong door, the leather club's two blocks down";
            kao = "( ͠° ͟ʖ ͡°)";
            break;
        default:
            message = "Aaarghhh! They put me down! Please, get someone to help!";
            kao = "(ಥ﹏ಥ)";
    }
    
    res.render("error", {
        error: {
            code: err.status || 500,
            message: message,
            smile: kao
        }
    });
});

// final server dispatch
const port = process.env.PORT || 3000;
var server = http.listen(port, () => {
    console.log(`A thunder is striking at http://127.0.0.1:${port}/`);
});