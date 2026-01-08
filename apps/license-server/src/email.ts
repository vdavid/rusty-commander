import { Resend } from 'resend'

interface EmailParams {
    to: string
    customerName: string
    licenseKey: string
    productName: string
    supportEmail: string
    resendApiKey: string
}

export async function sendLicenseEmail(params: EmailParams): Promise<void> {
    const resend = new Resend(params.resendApiKey)

    await resend.emails.send({
        from: `${params.productName} <noreply@getcmdr.com>`,
        to: params.to,
        subject: `Your ${params.productName} license key 🎉`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .license-box { background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0; font-family: monospace; font-size: 18px; text-align: center; letter-spacing: 2px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <h1>Welcome to ${params.productName}! 🚀</h1>
    
    <p>Hey ${params.customerName},</p>
    
    <p>Thanks for purchasing ${params.productName}! Here's your license key:</p>
    
    <div class="license-box">
        ${params.licenseKey}
    </div>
    
    <h3>How to activate:</h3>
    <ol>
        <li>Open ${params.productName}</li>
        <li>Go to <strong>Menu → Enter License Key</strong></li>
        <li>Paste the key above and click Activate</li>
    </ol>
    
    <p>That's it! Your license is valid forever on up to 2 machines.</p>
    
    <div class="footer">
        <p>Questions? Just reply to this email or contact <a href="mailto:${params.supportEmail}">${params.supportEmail}</a></p>
        <p>Happy file managing! ⌘</p>
    </div>
</body>
</html>
        `.trim(),
        text: `
Welcome to ${params.productName}!

Hey ${params.customerName},

Thanks for purchasing ${params.productName}! Here's your license key:

${params.licenseKey}

How to activate:
1. Open ${params.productName}
2. Go to Menu → Enter License Key
3. Paste the key above and click Activate

That's it! Your license is valid forever on up to 2 machines.

Questions? Contact ${params.supportEmail}

Happy file managing! ⌘
        `.trim(),
    })
}
