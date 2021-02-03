const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const dbPath = process.env.MONGODB_URI;
const Charge = require('./models/Charge');
// const seeds = require('./seed/seeds');
const emailLogic = require('./email-logic');
console.log('\nurl is localhost:5000\n');
mongoose
	.connect(dbPath, {
		useCreateIndex: true,
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		// console.log(`conected to ${dbPath}`);
	})
	// 	 .then(() => {
	// 	return User.deleteMany();
	//  })
	//  .then(() => {
	//  	return User.create(seeds);
	//  })
	//  .then(() =>{
	//  	console.log('added seed to db');
	//  	mongoose.connection.close();
	//  })
	.catch(error => {
		console.error(error);
	});

const demoRouter = require('./routes/demo');
const userRouter = require('./routes/User');

const app = express();

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE);

app.use(express.json());

// app.use(cors({ origin: true }));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

/// COMO VER SI HAS ACTUALIZDO EL BACKEND
/// COMO VER SI HAS ACTUALIZDO EL BACKEND
/// COMO VER SI HAS ACTUALIZDO EL BACKEND
/// COMO VER SI HAS ACTUALIZDO EL BACKEND
app.get('/', function(req, res) {
	let version = 10;
	res.send(`v: ${version}`);
});

var whitelist = [
	undefined,
	'localhost',
	'http://localhost:3000',
    'https://master.d3t17cckm1h0gu.amplifyapp.com',
	'https://coinsenders.com',
	'https://www.coinsenders.com',
	'https://coinsenders.com/',
	'https://www.coinsenders.com/',
];
var corsOptions = {
	origin: function(origin, callback) {
		if (whitelist.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	}
};

app.use(cors(corsOptions));
app.options('/create-checkout-session', cors(corsOptions));
app.post('/create-checkout-session', cors(corsOptions), async (req, res) => {
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: req.body.currency,
					product_data: {
						name: req.body.name,
						description: req.body.description,
					},
					unit_amount: req.body.quantity,
				},
				quantity: 1,
			},
		],
		mode: 'payment',
		success_url: 'https://coinsenders.com?thanks=true',
		cancel_url: 'https://coinsenders.com',
	});
	// TODO: get name and price from UI
	const email = req.body.description.substring(15);
	const resBTC = await axios.get('https://api.coinbase.com/v2/prices/spot?currency=EUR');
	console.log(resBTC.data.data.amount);

	const newCharge = new Charge({
		btcPrice: resBTC.data.data.amount,
		currency: req.body.currency,
		emailRecipient: email,
		paidAmount: req.body.quantity,
		sessionID: session.id,
		paid: false,
		emailSent: false,
	});
	console.log(newCharge); // 'newCharge'
	newCharge.save();
	res.json({ id: session.id });
});

app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
	session({
		store: new MongoStore({
			mongooseConnection: mongoose.connection,
			ttl: 24 * 60 * 60, // 1 day
		}),
		secret: process.env.SECRET_SESSION,
		resave: true,
		saveUninitialized: true,
		name: 'ironhack',
		cookie: {
			maxAge: 24 * 60 * 60 * 1000,
		},
	})
);

app.use('/user', userRouter);
app.use('/protected', demoRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
	res.status(404).json({ code: 'not found' });
});

app.use((err, req, res, next) => {
	// always log the error
	console.error('ERROR', req.method, req.path, err);

	// only render if the error ocurred before sending the response
	if (!res.headersSent) {
		res.status(500).json({ code: 'unexpected', error: err });
	}
});

emailLogic();

module.exports = app;
