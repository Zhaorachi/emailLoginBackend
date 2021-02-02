/* eslint-disable no-else-return */
/* eslint-disable no-console */
const mongoose = require('mongoose');
const EmailUser = require('../models/EmailUser');

const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = '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';
const apiInstance = new SibApiV3Sdk.EmailCampaignsApi();
const apiInstanceList = new SibApiV3Sdk.ListsApi();
const apiInstanceContacts = new SibApiV3Sdk.ContactsApi();

async function createContractBasedOnEmail(email) {
	const createContact = new SibApiV3Sdk.CreateContact(); // CreateContact | Values to create a contact
	createContact.email = email;
	return apiInstanceContacts.createContact(createContact);
}
async function createList() {
	const createListObj = new SibApiV3Sdk.CreateList(); // CreateList | Values to create a list
	createListObj.name = `BuyerList-${Date.now()}`;
	createListObj.folderId = 3;
	const listID = await apiInstanceList.createList(createListObj).then(
		function(data) {
			//   console.log("API called successfully. Returned data: " + data);
			//   console.log(JSON.stringify(data));
			return data.id;
		},
		function(error) {
			console.error(error);
		}
	);
	return listID;
}

async function main(emailList) {
	try {
		console.log(1);
		// create new list
		const newListID = await createList();
		// get emails from charge
		// check if exists in db
		// TODO: ADD USERS TO A LIST THEN ADD ALL AT ONCE
		const promises = [];
		await emailList.forEach(e => {
			// get/create emailId and add to list
			const firstPromise = EmailUser.findOneOrCreate({ emailPayer: e }, exists => {
				if (exists) {
					// 4. Didn't create new record
					return 'no need for promise';
				} else {
					// newly created contact
					console.log('should run before 1.6 or 1.7');
					return createContractBasedOnEmail(e);
				}
			});
			promises.push(firstPromise);
		});
		// console.log('promises', promises);
		const values = await Promise.all(promises);
		await Promise.all(values);
		console.log('values', values);
		console.log(`1.1-1.7`);
		const contactEmails = new SibApiV3Sdk.AddContactToList(); // AddContactToList | Emails addresses OR IDs of the contacts
		contactEmails.emails = [...emailList];
		console.log('emailList', emailList);
		console.log(1.8);
		await apiInstanceContacts.addContactToList(newListID, contactEmails).then(
			function() {
				console.log('added emails to new list.');
			},
			function(error) {
				console.log('error adding emails to list');
				console.error(error);
			}
		);

		console.log(2);
		// edit campaign list
		const campaignId = 1;
		console.log(3.3);
		const emailCampaign = new SibApiV3Sdk.UpdateEmailCampaign();
		console.log(3.4);
		emailCampaign.recipients = { listIds: [newListID] };
		console.log(3.5);
		await apiInstance.updateEmailCampaign(campaignId, emailCampaign).then(
			function() {
				console.log('updated campaign.');
			},
			function(error) {
				console.log('Emails NOT sent - NOT - NOT - NOT - NOT .');
				console.error(error);
			}
		);
		console.log(4);
		// send campaign now
		await apiInstance.sendEmailCampaignNow(campaignId).then(
			function() {
				console.log('Emails sent.');
			},
			function(error) {
				console.log('Emails NOT sent - NOT - NOT - NOT - NOT .');
				console.error(error);
			}
		);
		console.log('The End');
	} catch (e) {
		return false;
	}
	return true;
}
module.exports = main;
