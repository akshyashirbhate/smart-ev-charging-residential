const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    wingName:{type:String,required:true},
    flatNumber:{type:String,required:true},
    role:{type:String,enum:['user','admin'],default:'user'},
    monthlyBill:{type:Number,default:0}
});

module.exports = mongoose.model('User',UserSchema);