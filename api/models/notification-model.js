var _         = require('underscore');
var mongoose  = require('mongoose');
var Schema    =  mongoose.Schema;
var ObjectId  = Schema.Types.ObjectId;

var notificationSchema = new Schema({
  type: { type: String },
  createDate: { type: Date },
  read: { type: Boolean },
  emailSent: { type: Boolean },

  pub: { type: ObjectId, ref: 'Pub' },
  sender: { type: ObjectId, ref: 'User' },
  recipient: { type: ObjectId, ref: 'User' },

});

notificationSchema.statics.getNotification = function(notificationID,callback) {
  this.findById(notificationID)
  .exec(function (err, notification) {
    if (err) callback(err);
    callback(null,notification);
  });
}

notificationSchema.statics.getNotifications = function (user,callback) {
  this.find({'recipient':user})
  .sort({'createDate': -1})
  .exec(function(err, notifications) {
      if (err) callback(err);
      callback(null,notifications);
    });
  return;
};

notificationSchema.statics.createNotification = function(type, sender, recipient, pub) {
  var date = new Date().getTime();

  const validTypes = [
    'discussion/repliedTo',
    'discussion/pubComment',
    'follows/followedYou',
    'follows/followedPub',
    'followers/newPub',
    'followers/newVersion',
  ];

  if (validTypes.indexOf(type) === -1) {
    console.log('Invalid type: ' + type);
    return;
  }
  
  var notification = new Notification({
    type: type,
    createDate: date,    
    read: false,
    emailSent: false,

    pub: pub,
    sender: sender,
    recipient: recipient,
  });

  notification.save(function (err, notification) {
    if (err) { console.log(err); }
    //console.log(notification);
    return;
  });
}



var Notification = mongoose.model('Notification',notificationSchema);

module.exports = Notification;
