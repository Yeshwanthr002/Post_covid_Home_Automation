const express = require('express');
const bodyParse = require('body-parser');
const temp = require('mongoose');
const app = express();
const user = require("./models/consumers");
const passport = require("passport");
const strategy = require("passport-local");
const passandmongo = require("passport-local-mongoose");
const mqtt = require("mqtt");
const tf = require('@tensorflow/tfjs');
const sensor_data = require('./models/sensor_data');

var client = mqtt.connect('mqtt://broker.mqtt-dashboard.com');
let level = 0;

require('dotenv').config();
const plotly = require('plotly')(process.env.PLOTLY_USER, process.env.PLOTLY_KEY);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twillioclient = require('twilio')(accountSid, authToken);


function sendMessage() {
	twillioclient.messages
		.create({
			body: 'Someone at the door. Pls check the door',
			from: '+12089968509',
			to: '+917358678900'
		})
		.then(message => console.log(message.sid));
}

client.on("connect", function () {
	client.subscribe('my/tank');
	client.subscribe('my/door');
	console.log('Subscribed to my/tank');
	client.subscribe('my/light');
	console.log('Subscribed to my/light');
});
var door_state;
var db_door_state;


client.on('message', function (topic, message) {
	console.log(message.toString());
	if (topic == 'my/tank') {
		level = Number(message);
		var d = new Date()
		//console.log('Difference', level - d.getSeconds())
		//console.log('given', level)
		//console.log('now', d.getSeconds())

	}
	if (topic == 'my/door') {
		if (message.toString() == '0') {
			sendMessage();
			door_state = "Last triggered " + Date();
		}

	}
})
var dbcon = 0;
var mongourl = 'mongodb+srv://' + process.env.ATLASDB_USERID + ':' + process.env.ATLASDB_PWD + '@cluster0.xemgp.mongodb.net/MyHome?retryWrites=true&w=majority';
temp.set('useUnifiedTopology', true);
temp.connect(mongourl, {
	useNewUrlParser: true,
	useCreateIndex: true
}).then(() => {
	console.log("Connected to DB!");
	dbcon = 1
}).catch(err => {
	console.log("ERROR: ", err.message);
});


app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(bodyParse.urlencoded({ extended: true }));
app.use(require("express-session")({
	secret: "My parents are greater than God to me!",
	resave: false,
	saveUninitialized: false
}));

//INITIALIZING Passport with Express
app.use(passport.initialize());
app.use(passport.session());

app.use(function (req, res, next) {
	res.locals.currentUser = req.user;
	next();
})
passport.use(new strategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

//ROUTES
app.get("/", function (req, res) {
	res.redirect('/dashboard')
})

function logvalues(req) {
	if (dbcon) {
		const water = new sensor_data({
			sname: "Waterlvl",
			user: req.user._id,
			date: Date(),
			sdata: level
		});
		const bell = new sensor_data({
			sname: "bell",
			user: req.user._id,
			date: Date(),
			sdata: door_state
		});
		water.save().then((results) => {
		}).catch((err) => {
			console.log(err);
		})
	}

}
app.get("/visualize", isLoggedIn, (req, res) => {
	var data = [];
	var x = [];
	var y = [];
	sensor_data.find({ user: req.user._id, sname: 'Waterlvl' }).then((result) => {
		result.map((res, index) => {
			y[index] = res.sdata;
			x[index] = res.date;
		})
		res.render('plot', { plotx: x, ploty: y })
	});
})
app.get("/dashboard", isLoggedIn, function (req, res) {
	logvalues(req);
	if (level <= 1)
		level = 15

	res.render('dashboard', { waterlvl: level, state: state, door: door_state });
})

//AUTH Routes
app.get("/register", function (req, res) {
	res.render('register');
})

app.post("/register", function (req, res) {
	var newUser = new user({ username: req.body.username, address: req.body.address });
	user.register(newUser, req.body.password, function (err, body) {
		if (err) {
			console.log(err);
			res.redirect("/register");
		}
		passport.authenticate("local")(req, res, function () {
			res.redirect("/dashboard");
		})
	})
})
var state = 1;
app.post("/lighton", (req, res) => {

	if (state == 0) {
		state = 1;
		client.publish('my/light', '1');
	}
	else {
		state = 0;
		client.publish('my/light', '0');
	}
	res.redirect("/dashboard");
})
//LOGIN Routes.
app.get("/login", checknotauth, function (req, res) {
	res.render('login');
})
//Of the form app.post(url, middleware, callback)
app.post("/login", passport.authenticate("local", { successRedirect: "/dashboard", failureRedirect: "/login" }),
	function (req, res) {
	})
app.get("/logout", function (req, res) {
	req.logout();
	res.redirect("/");
})

//Middleware
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect("/login");
}
function checknotauth(req, res, next) {
	if (req.isAuthenticated()) {
		return res.redirect('/dashboard');
	}
	return next()
}

app.listen(process.env.PORT_NO, '0.0.0.0', function () {
	console.log('Listening to port:  ' + process.env.PORT_NO);
});
