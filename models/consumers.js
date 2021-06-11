var temp= require("mongoose"),
	passwithmongo= require("passport-local-mongoose");

var userSchema= new temp.Schema({
	username: String,
	address: String,
	password: String,
	lat: Number,
	lon: Number
});
userSchema.plugin(passwithmongo);
module.exports= temp.model("User",userSchema);