const mongoose = require('mongoose');
const emailSchema = new mongoose.Schema(
	{
		emailPayer: String,
		token: String,
	},
	{
		timestamps: {
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	}
);

emailSchema.statics.findOneOrCreate = function findOneOrCreate(condition, callback) {
	const self = this;
	return self.findOne(condition, (err, result) => {
		if (!result) {
			self.create(condition);
		}
		return callback(result);
	});
};
const EmailUser = mongoose.model('EmailUser', emailSchema);

module.exports = EmailUser;
