var temp = require("mongoose");
const Schema = temp.Schema;
ObjectId = Schema.ObjectId;
var sensor_data = new temp.Schema({
    sname: String,
    user: ObjectId,
    date: Date,
    sdata: Number
});

module.exports = temp.model("Sensor", sensor_data);