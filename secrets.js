// Data is read from select statements published by server
secrets = new MysqlSubscription('allSecrets');

if (Meteor.isClient) {

  // Provide a client side stub
  Meteor.methods({
    'insertSecret': function(text){
      console.log("Client side: inserting: ", text)
      // Force UI refresh
      secrets.changed();
      console.log(secrets);
    }
  });

  Template.secrets.helpers({
    secrets: function () {
      return secrets.reactive();
    },
    selectedName: function () {
      secrets.depend();
      var secret = secrets.filter(function(secret) {
        return secret.id === Session.get("selectedSecret");
      });
      return secret.length && secret[0].confession;
    }
  });

  Template.secrets.events({
    'click .inc': function () {
      Meteor.call('incScore', Session.get("selectedSecret"), 5);
    },
    'submit .type-your-secret': function(event) {
      event.preventDefault();
      var target = event.target;
      Meteor.call('insertSecret', target.text.value);
      target.text.value = '';
    }
  });

  Template.secret.helpers({
    selected: function () {
      return Session.equals("selectedSecret", this.id) ? "selected" : '';
    }
  });

  Template.secret.events({
    'click': function () {
      Session.set("selectedSecret", this.id);
    }
  });
}

if (Meteor.isServer) {

  var liveDb = new LiveMysql({
    // These credentials should live in .env, in the root of this repo
    host: process.env.CONFESH_HOST,
    port: Number(process.env.CONFESH_PORT),
    user: process.env.CONFESH_USERNAME,
    password: process.env.CONFESH_PASSWORD,
    database: process.env.CONFESH_DATABASE
  });

  var closeAndExit = function() {
    liveDb.end();
    process.exit();
  };
  // Close connections on hot code push
  process.on('SIGTERM', closeAndExit);
  // Close connections on exit (ctrl + c)
  process.on('SIGINT', closeAndExit);

  Meteor.publish('allSecrets', function() {
    return liveDb.select(
      'SELECT * FROM confessional_secrets ORDER BY create_date DESC LIMIT 10',
      [ { table: 'confessional_secrets' } ]
    );
  });

  Meteor.methods({
    'insertSecret': function(text) {
      check(text, String);

      var id = Math.floor(Math.random() * (100000000 - 5000000 + 1)) + 5000000;
      var date = new Date().getTime();
      var ts = Math.floor(date / 1000);
      console.log('Inserting into DB', [ id, text, 0, 0, ts ]);

      liveDb.db.query(
        'INSERT INTO confessional_secrets ' +
        '(id, confession, complaints, comments, create_date)' +
        'VALUES (?, ?, ?, ?, ?)', [ id, text, 0, 0, ts ]);
    }
  });
}
