const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true },
		bitcoin: { type: Number, required: true },
	},
	{
		timestamps: {
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	}
);

const User = mongoose.model('User', userSchema);

module.exports = User;
