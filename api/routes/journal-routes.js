var app = require('../api');
var passport = require('passport');

var Journal = require('../models').Journal;
var User = require('../models').User;
var Heroku = require('heroku-client');
var heroku = undefined;

if(process.env.NODE_ENV !== 'production'){
	import {herokuApiKey} from '../authentication/herokuCredentials';	
	heroku = new Heroku({ token: herokuApiKey });
}else{
	heroku = new Heroku({ token: process.env.HEROKU_API_KEY });
}

app.get('/testheroku', function(req,res){

	heroku.post('/apps/immense-escarpment-3653/domains', { hostname: 'funky.pbpb.co' }, function (err, app) {
		if (err) {console.log(err);}
		heroku.apps('immense-escarpment-3653').domains().list(function (err, apps) {
		  return res.status(201).json(apps);
		});
	});
	// heroku.delete('/apps/immense-escarpment-3653/domains/funky.pbpb.co', function (err, app) {
	// 	heroku.apps('immense-escarpment-3653').domains().list(function (err, apps) {
	// 	  return res.status(201).json(apps);
	// 	});
	// });

});

app.post('/createJournal', function(req,res){
	const journal = new Journal({
		journalName: req.body.journalName,
		subdomain: req.body.subdomain,
		createDate: new Date().getTime(),
		admins: [req.user._id],
	});

	journal.save(function (err, savedJournal) {
		if (err) { return res.status(500).json(err);  }
		User.update({ _id: req.user._id }, { $addToSet: { adminJournals: savedJournal._id} }, function(err, result){if(err) return handleError(err)});

		return res.status(201).json(savedJournal.subdomain);	

	});
});

app.get('/getJournal', function(req,res){
	Journal.findOne({subdomain: req.query.subdomain})
	.populate({path: "pubs", select:"title abstract slug settings"})
	.populate({path: "pubsFeatured", select:"title abstract slug settings"})
	.populate({path: "pubsSubmitted", select:"title abstract slug settings"})
	.populate({path: "admins", select:"name username thumbnail"})
	.lean().exec(function(err, result) {
		if (err) { return res.status(500).json(err);  }

		let isAdmin = false;
		const userID = req.user ? req.user._id : undefined;
		const adminsLength = result ? result.admins.length : 0;
		for(let index = adminsLength; index--; ) {
			if (String(result.admins[index]._id) === String(userID)) {
				isAdmin =  true;	
			}
		}

		return res.status(201).json({
			...result,
			isAdmin: isAdmin,
		});
	});
});

app.post('/saveJournal', function(req,res){
	Journal.findOne({subdomain: req.body.subdomain}).exec(function(err, journal) {
		// console.log('in server save journal');
		// console.log('req.body', req.body);
		// console.log('journal', journal);

		if (err) { return res.status(500).json(err);  }

		if (!req.user || String(journal.admins).indexOf(req.user._id) === -1) {
			return res.status(403).json('Not authorized to administrate this Journal.');
		}

		// if () check for customDomain change
		for (const key in req.body.newObject) {
			if (req.body.newObject.hasOwnProperty(key)) {
				journal[key] = req.body.newObject[key];
			}
		}
		

		journal.save(function(err, result){
			if (err) { return res.status(500).json(err);  }
			
			const options = [
				{path: "pubs", select:"title abstract slug settings", model: 'Pub'},
				{path: "pubsFeatured", select:"title abstract slug settings", model: 'Pub'},
				{path: "pubsSubmitted", select:"title abstract slug settings", model: 'Pub'},
				{path: "admins", select:"name username thumbnail", model: 'User'},
			];

			Journal.populate(result, options, (err, populatedJournal)=> {
				return res.status(201).json({
					...populatedJournal.toObject(),
					isAdmin: true,
				});		
			});
			
			
		});
	});
});

app.get('/loadJournalAndLogin', function(req,res){
	// Load journal Data
	// When an implicit login request is made using the cookie
	Journal.findOne({ $or:[ {'subdomain':req.query.host.split('.')[0]}, {'customDomain':req.query.host}]})
	.populate({path: "pubs", select:"title abstract slug settings"})
	.populate({path: "pubsFeatured", select:"title abstract slug settings"})
	.populate({path: "pubsSubmitted", select:"title abstract slug settings"})
	.populate({path: "admins", select:"name username thumbnail"})
	.lean().exec(function(err, result){
		// console.log('journalResult', result);
		
		let isAdmin = false;
		const userID = req.user ? req.user._id : undefined;
		const adminsLength = result ? result.admins.length : 0;
		for(let index = adminsLength; index--; ) {
			if (String(result.admins[index]._id) === String(userID)) {
				isAdmin =  true;	
			}
		}

		if(req.user){
			return res.status(201).json({
				journalData: {
					...result,
					isAdmin: isAdmin,
				},
				loginData: {
					name: req.user.name,
					username: req.user.username,
					image: req.user.image,
					thumbnail: req.user.thumbnail,
					settings: req.user.settings
				},
			});

		}else{
			return res.status(201).json({
				journalData: {
					...result,
					isAdmin: false,
				},
				loginData: 'No Session',
			});
		}
	});


});