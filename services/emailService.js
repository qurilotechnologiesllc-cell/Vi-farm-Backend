const SibApiV3Sdk = require('sib-api-v3-sdk')

const defaultClient = SibApiV3Sdk.ApiClient.instance
const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.BREVO_API_KEY

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()

const sendEmailOtp = async (email, otp, name) => {  // ← name add kiya!
  try {
    const response = await apiInstance.sendTransacEmail({

      sender: {
        email: process.env.BREVO_USER,
        name: "ViFarm Team",
      },

      to: [
        {
          email: email,
          name: name,   // ← Ye bhi add karo!
        },
      ],

      templateId: 6,        // ← URL mein /edit/3 dikh raha hai!

      params: {
        name: name,     // ← {{params.name}} ke liye ✅
        otp: otp,      // ← {{params.otp}} ke liye ✅
        expiry: "10",     // ← {{params.expiry}} ke liye ✅
      },
    });

    console.log("Email Sent!", response)

  } catch (error) {
    console.log(error.response?.body || error.message)
  }
}

module.exports = { sendEmailOtp }