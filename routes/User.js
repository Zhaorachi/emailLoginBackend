const express = require('express');
const User = require('../models/User');
const EmailUser = require('../models/EmailUser');
const jwt = require('jsonwebtoken');
const aws = require('aws-sdk');
const nodemailer = require('nodemailer');
const { checkIfLoggedIn } = require('../middlewares');

const SESconfig = {
    apiVersion: '2010-12-01',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    accessSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "us-east-1"
};

const transporter = nodemailer.createTransport({
    service: process.env.GMAIL_SERVICE_NAME,
    host: process.env.GMAIL_SERVICE_HOST,
    port: process.env.GMAIL_SERVICE_PORT,
    auth: {
        user: process.env.GMAIL_USER_EMAIL,
        pass: process.env.GMAIL_USER_PASS
    }
});

const router = express.Router();

router.get('/', (req, res, next) => {
	EmailUser.find()
		.then(users => {
			return res.status(200).json(users);
		})
		.catch(next);
});

router.post('/', (req, res, next) => {
    const { emailPayer } = req.body;
      EmailUser.create({
        emailPayer,
        token: "",
      })
        .then(newUser => {
          res.status(201).json(newUser);
          console.log(res);
        })
        .catch(next);
});

router.post('/login', (req, res, next) => {
    const { email, phone } = req.body;
    EmailUser.findOne({emailPayer: email})
        .then(doc => {
            console.log(email);
            if(doc) {
                const securityCode = jwt.sign({
                    userId: doc._id,
                    type: "login"
                }, '35183E4CC1B5D98DA4844579163985538FF57130107FCD314ADB212E82084DB8', {expiresIn: '1d'});
                const loginUrl = req.protocol + "://" + req.get('host') + '/user/confirm/' + securityCode;
                console.log(securityCode);

                // var params = {
                //     Destination: {
                //         CcAddresses: ['test@test.com'],
                //         ToAddresses: [doc.email]
                //     },
                //     Message: {
                //         Body: {
                //             Html: {
                //                 Charset: "UTF-8",
                //                 Data: `Hello, <b>${doc.name}</b>!
                //                     <br>To log in, please click <a href="${loginUrl}">here</a>.
                //                     <br>Thank you!`,
                //             },
                //         },
                //         Subject: {
                //             Charset: "UTF-8",
                //             Data: "Login email"
                //         }
                //     },
                //     Source: "test@test.com",
                // };

                // let sendPromise = new aws.SES(SESconfig).sendEmail(params).promise();
                // sendPromise.then(function(data) {
                //         return res.status(200).send({success: true, message: "Email sent successfully.", data: data});
                //     })
                //     .catch(function(err) {
                //         console.error(err, err.stack);
                //     });
                const mailOptions = {
                    from: process.env.GMAIL_USER_EMAIL,
                    to: doc.emailPayer,
                    subject: 'Login Email',
                    html: `To log in, please click <a href="${loginUrl}">here</a>.
                            <br>Thank you!`
                };
                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        console.log(error);
                        return res.status(202).send({
                            success: false,
                            message: 'Something went wrong sending a login email to you.'
                        });
                    } else {
                        EmailUser.updateOne({_id: doc._id}, {$set: {token: securityCode}}, {new: true}, function (err, task) {
                            if (err) return res.status(202).send({success: false, message: "Something went wrong."});
                        });
                        return res.status(200).send({success: true, message: "Email sent successfully."});
                    }
                });
            }else {
                return res.status(201).send({success: false, message: "The email doesn't exist."});
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(202).send({success: false, message: "Something went wrong."});
        });
});

router.get('/confirm/:securityCode', (req, res, next) => {
    let userId = null;
    EmailUser.findOne({token: req.params.securityCode})
        .then(doc => {
            if(doc) {
                jwt.verify(req.params.securityCode, '35183E4CC1B5D98DA4844579163985538FF57130107FCD314ADB212E82084DB8', function(err, data) {
                    if(err) {
                        return res.status(410).send({success: false, message: "Your login link is invalid or expired."});
                    }else {
                        userId = data.userId;
                        const token = jwt.sign({
                            userId: userId,
                            type: "confirm"
                        }, 'BF787D7F6F9F42C1D9FAFE262EA1252B4F6B889E68FE74637141D9B286699142', {expiresIn: '1d'});
                        EmailUser.updateOne({_id: userId}, {$set: {token: token}}, {new: true}, function(err, task) {
                            if(err) return res.status(500).send({success: false, message: "Something went wrong."});
                        });
                        return res.status(200).send({success: true, token: token});
                    }
                });
            }else {
                return res.status(410).send({success: false, message: "Your login link is invalid."});
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send({success: false, message: "Something went wrong."});
        });
});

router.post('/phoneLogin', (req, res, next) => {
    // const { phone } = req.body;
    // EmailUser.findOne({phone: phone})
    //     .then(doc => {
    //         if(doc) {
                const accountSid = process.env.TWILIO_ACCOUNT_SID;
                const authToken = process.env.TWILIO_AUTH_TOKEN;
                const client = require('twilio')(accountSid, authToken);

                client.messages
                    .create({
                        body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
                        from: '+19736264505',
                        to: '+18604965749'
                    })
                    .then(message => console.log(message.sid))
                    .catch(err => {console.log(err)});
            // }else {
            //     return res.status(204).send({success: false, message: "The phone number doesn't exist."})
            // }
        // })
        // .catch(err =>{
        //     console.log(err);
        //     return res.status(500).send({success: false, message: "Something went wrong."});
        // })
});

module.exports = router;
