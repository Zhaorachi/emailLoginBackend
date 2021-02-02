/* eslint-disable func-names */
/* eslint-disable no-console */
const stripe = require('stripe')(process.env.STRIPE);
const mongoose = require('mongoose');
const fs = require('fs');
const moment = require('moment');
const Charge = require('../models/Charge');
const SendBlue = require('./SendBlue');

// const SibApiV3Sdk = require('sib-api-v3-sdk');
// const defaultClient = SibApiV3Sdk.ApiClient.instance;
// const apiKey = defaultClient.authentications['api-key'];
// apiKey.apiKey = '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';
// const apiInstance = new SibApiV3Sdk.EmailCampaignsApi();
// const apiInstanceList = new SibApiV3Sdk.ListsApi();
// const apiInstanceContacts = new SibApiV3Sdk.ContactsApi();

// // TODO: ALLOW SENDING TO PREVIOUSLY SENT EMAIL
// // THE API SENDS CREATES A LIST AFTER CREATING
// // NEW CONTACTS.
// // TO FIX, FIND EXISTING CONTACTS AND CREATE LIST BASED ON THAT

// async function createEmailBurst(listIds, emailHTML) {
// 	// # ------------------
// 	// # Create a campaign\
// 	// # ------------------
// 	// listIds: [2]

// 	const emailCampaigns = new SibApiV3Sdk.CreateEmailCampaign();
// 	emailCampaigns.name = `BuyerConfirmation ${Date.now()}`;
// 	emailCampaigns.subject = 'Acabas de regalar Bitcoin!';
// 	emailCampaigns.sender = { name: 'CoinSenders', email: 'coinsenders@coinsenders.com' };
// 	emailCampaigns.replyTo = 'support@coinsenders.com';
// 	emailCampaigns.type = 'classic';
// 	emailCampaigns.htmlContent = emailHTML;
// 	emailCampaigns.recipients = { listIds };
// 	// # SEND AFTER 1 MINUTE OF RUNNING FUNCTION
// 	emailCampaigns.scheduledAt = moment(Date.now() + 60000).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
// 	// # Make the call to the client
// 	const success = await apiInstance.createEmailCampaign(emailCampaigns).then(
// 		function(data) {
// 			// console.log(`API called successfully. Created campaign #${data.id}`);
// 			return true;
// 		},
// 		function(error) {
// 			console.error(error);
// 			return false;
// 		}
// 	);
// 	return success;
// }

// async function createListWithEmails(emailList) {
// 	const createList = new SibApiV3Sdk.CreateList(); // CreateList | Values to create a list
// 	createList.name = `testAPI${Date.now()}`;
// 	createList.folderId = 3;
// 	const listID = await apiInstanceList.createList(createList).then(
// 		function(data) {
// 			//   console.log("API called successfully. Returned data: " + data);
// 			//   console.log(JSON.stringify(data));
// 			return data.id;
// 		},
// 		function(error) {
// 			console.error(error);
// 		}
// 	);
// 	const createContact = new SibApiV3Sdk.CreateContact(); // CreateContact | Values to create a contact
// 	createContact.email = emailList[0];
// 	createContact.listIds = [listID];
// 	await apiInstanceContacts.createContact(createContact).then(
// 		function(data) {
// 			//   console.log("API called successfully. Returned data: " + data);
// 			//   console.log(JSON.stringify(data));
// 		},
// 		function(error) {
// 			console.error(error);
// 		}
// 	);
// 	return listID;
// }

// async function sendYourWelcome(emails) {
// 	// return true or false
// 	// test this func
// 	const welcomeEmail = fs.readFileSync('./emailtemplates/confirmation_payment.html', 'utf8');
// 	// create list
// 	const newListID = await createListWithEmails(emails);
// 	// create and schedule camplain with list
// 	const success = await createEmailBurst([newListID], welcomeEmail);
// 	// mark email as sent
// 	return success;
// }

async function main() {
	const dbPath = process.env.MONGODB_URI;
	await mongoose
		.connect(dbPath, {
			useCreateIndex: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(() => {
			console.log(`conected to ${dbPath}`);
		})
		.catch(error => {
			console.error(error);
		});

	async function theAsyncFunction(testEmail) {
		const unsentChargesEmails = [];
		if (!testEmail) {
			const sessions = await stripe.checkout.sessions.list({
				limit: 300,
			});
			const newCharges = sessions.data.filter(c => c.payment_status === 'paid');
			// Add logic to process multiple at same time
			console.log(`found ${newCharges.length} paid charges (old & new)`);
			for (let i = 0; i < newCharges.length; i++) {
				const latest = newCharges[i];
				const paymentIntentID = latest.payment_intent;
				// eslint-disable-next-line no-await-in-loop
				const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentID);
				const emailPayer = paymentIntent.charges.data[0].billing_details.email;
				const sessionID = latest.id;
				const callbackFunc = (err, kittens) => {
					if (err) return console.error(err);
					if (kittens.length) {
						unsentChargesEmails.push(emailPayer);
						const charge = kittens[0];
						charge.emailPayer = emailPayer;
						charge.paymentID = paymentIntentID;
						charge.paid = true;
						charge.emailSent = true;
						charge.save();
					}
				};
				Charge.find({ sessionID, emailSent: false }, callbackFunc);
			}
		} else {
			unsentChargesEmails.push(testEmail);
		}
		console.log(`Found ${unsentChargesEmails.length} unsent emails to buyers`);
		if (unsentChargesEmails.length) {
			console.log('Sending...');
			SendBlue(unsentChargesEmails);
		}
	}

	const requestLoop = setInterval(theAsyncFunction, 60000);
	// If you ever want to stop it...  clearInterval(requestLoop)
	// theAsyncFunction(`hello${Date.now()}@maxawad.com`);
}

module.exports = main;
