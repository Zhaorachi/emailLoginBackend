const mongoose = require('mongoose');
const chargeSchema = new mongoose.Schema(
	{
		sessionID: String, //
		paymentID: String, //
		emailPayer: String, //
		nameRecipient: String, //
		emailRecipient: String, //
		paidAmount: String, //
		btcPrice: String, //
		currency: String, //
		cryptoAmountSent: Boolean, //
		paid: Boolean, //
		emailSent: Boolean, //
		emailSentToRecipient: Boolean, //
	},
	{
		timestamps: {
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	}
);

const Charge = mongoose.model('Charge', chargeSchema);

module.exports = Charge;
