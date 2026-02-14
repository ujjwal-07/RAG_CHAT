require('dotenv').config({ path: '.env' });
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

(async function () {
    console.log('Testing Resend with API Key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
    try {
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'delivered@resend.dev',
            subject: 'Test Email',
            html: '<p>Test email</p>'
        });
        console.log('Success:', data);
    } catch (error) {
        console.error('Error:', JSON.stringify(error, null, 2));
    }
})();
