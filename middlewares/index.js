const jwt = require("jsonwebtoken");

const checkIfLoggedIn = (req, res, next) => {
	if (req.body.token) {
	    jwt.verify(req.body.token, "BF787D7F6F9F42C1D9FAFE262EA1252B4F6B889E68FE74637141D9B286699142", function(err, data) {
            if(err) res.status(410).json({success: false, message: "Token expired"});
            else next();
        });
	} else {
		res.status(401).json({ success: false, message: 'unauthorized' });
	}
};

const checkUsernameAndPasswordNotEmpty = (req, res, next) => {
	const { username, password } = req.body;

	if (username !== '' && password !== '') {
		res.locals.auth = req.body;
		next();
	} else {
		res.status(422).json({ code: 'validation' });
	}
};

module.exports = {
	checkIfLoggedIn,
	checkUsernameAndPasswordNotEmpty,
};
