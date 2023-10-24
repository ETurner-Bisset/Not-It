import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import findOrCreate from "mongoose-findorcreate";

const app = express();
const port = 3000;

const date = new Date().getFullYear();



app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/noteItDB");


const noteSchema = new mongoose.Schema ({
    
    noteBody: String,
    userId: String
});

const Note = new mongoose.model("Note", noteSchema);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    notes: [noteSchema]
});



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });

passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// Authentication middleware
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      req.session.userId = req.user.id; // store the user ID in a session variable
      return next();
    }
    res.redirect("/login");
  };

app.get("/", async (req, res) => {
    res.render("index", {date: date});
    
});

app.get("/register", (req, res) => {
    res.render("register", {date: date});
});

app.get("/login", (req, res) => {
    res.render("login", {date: date});
});

app.get("/main", ensureAuthenticated, async (req, res) => {
    
    if (req.isAuthenticated()) {
        
        const foundUserNotes = await User.find({"notes": {$ne: null}}).exec();
        // console.log(foundUser);
        if (foundUserNotes) {
            // console.log(foundUserNotes[0].notes);
            res.render("main", {date: date, notes: foundUserNotes[0].notes})
        }
    
    } else {
        res.redirect("/login")
    } 
});

app.get("/note",  (req, res) => {
    if (req.isAuthenticated()) {
        res.render("note", {date: date})
    } else {
        res.redirect("/login")
    } 
});

 


app.post("/note", async (req, res) => {
    
    
    const userId = req.session.userId;
    
    const foundUser = await User.findById(userId).exec();
    // console.log(foundUser);
    if (foundUser) {
        const note = new Note({
            noteBody: req.body.noteBody,
            userId: foundUser._id
        });
        
        foundUser.notes.push(note);
        foundUser.save();
        // console.log(foundUser.notes);
        res.redirect("/main");
    }
    
});

app.post("/delete", async (req, res) => {
    const userId = req.session.userId;
    const foundUser = await User.findById(userId).exec();
    console.log(foundUser);
    if (foundUser) {
        const itemId = req.body.itemId;
        const foundNote = await Note.findByIdAndRemove(itemId).exec();
        console.log(foundNote);
        if (foundNote) {
            res.redirect("/main")
    }
    }
    
    
});

app.get("/logout", (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/main");
            });
        }
    });
});

app.post("/login", (req, res) => {
    const user = new User ({
        username: req.body.username,
        password: req.body.password,
    });
    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local") (req, res, function() {
                // console.log(user.id);
                res.redirect("/main");
            });
        }
    });
});





app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});