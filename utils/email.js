const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
module.exports = class Email {
  constructor(user, url) {
    this.to = user;
    email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Kikawyy Hegaz <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // send the actual email
  async send(template, subject) {
    //1) render html based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
    );

    //2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to.email,
      subject,
      html,
      text: htmlToText.fromString(html),
      // html:
    };
    //3) create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }
};
// const sendEmail = async (options) => {
//   //1) create a transporter (transporter is a service that will send the email we definelike "gmail")
//   // const transporter = nodemailer.createTransport({
//   //   host: process.env.EMAIL_HOST,
//   //   port: process.env.EMAIL_PORT,
//   //   auth: {
//   //     user: process.env.EMAIL_USERNAME,
//   //     pass: process.env.EMAIL_PASSWORD,
//   //   },
//   // ACTIVATE LESS SECURE APP OPTION :FOR {{GMAIL}}
//   // GMAIL IS NOT A GOOD IDEA FOR PRODUCTION, 500/DAY EMAILS / AND CAN BE SPAMMED
//   // });
//   //2) Define the email options - arguments you want o add in fn
//   const mailOptions = {
//     from: 'Kikawyy Ernold <m.353akram@gmail.com>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     //html:
//   };
//   //3) Actually send the email - returns a promise
//   console.log('📤 Sending email using:', {
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     user: process.env.EMAIL_USERNAME,
//   });
//   await transporter.sendMail(mailOptions);
// };
// // module.exports = sendEmail;
