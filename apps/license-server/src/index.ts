import { Hono } from 'hono'
import { generateLicenseKey, formatLicenseKey } from './license'
import { sendLicenseEmail } from './email'
import { verifyPaddleWebhook } from './paddle'

type Bindings = {
    PADDLE_WEBHOOK_SECRET: string
    ED25519_PRIVATE_KEY: string
    RESEND_API_KEY: string
    PRODUCT_NAME: string
    SUPPORT_EMAIL: string
}

interface PaddleWebhookPayload {
    event_type: string
    data?: {
        id?: string
        customer?: {
            email?: string
            name?: string
        }
    }
}

const app = new Hono<{ Bindings: Bindings }>()

// Health check
app.get('/', (c) => {
    return c.json({ status: 'ok', service: 'cmdr-license-server' })
})

// Paddle webhook - called when purchase completes
app.post('/webhook/paddle', async (c) => {
    const body = await c.req.text()
    const signature = c.req.header('Paddle-Signature') ?? ''

    // Verify webhook signature
    const isValid = await verifyPaddleWebhook(body, signature, c.env.PADDLE_WEBHOOK_SECRET)
    if (!isValid) {
        return c.json({ error: 'Invalid signature' }, 401)
    }

    const payload = JSON.parse(body) as PaddleWebhookPayload

    // Only handle completed purchases
    if (payload.event_type !== 'transaction.completed') {
        return c.json({ status: 'ignored', event: payload.event_type })
    }

    const customerEmail = payload.data?.customer?.email
    const customerName = payload.data?.customer?.name ?? 'there'
    const transactionId = payload.data?.id

    if (!customerEmail || !transactionId) {
        return c.json({ error: 'Missing customer email or transaction ID' }, 400)
    }

    // Generate license key
    const licenseData = {
        email: customerEmail,
        transactionId,
        issuedAt: new Date().toISOString(),
    }

    const licenseKey = await generateLicenseKey(licenseData, c.env.ED25519_PRIVATE_KEY)
    const formattedKey = formatLicenseKey(licenseKey)

    // Send license email
    await sendLicenseEmail({
        to: customerEmail,
        customerName,
        licenseKey: formattedKey,
        productName: c.env.PRODUCT_NAME,
        supportEmail: c.env.SUPPORT_EMAIL,
        resendApiKey: c.env.RESEND_API_KEY,
    })

    return c.json({ status: 'ok', email: customerEmail })
})

// Manual license generation (for testing or customer service)
// Protected by a simple secret in production
app.post('/admin/generate', async (c) => {
    const authHeader = c.req.header('Authorization')
    if (authHeader !== `Bearer ${c.env.PADDLE_WEBHOOK_SECRET}`) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const { email } = await c.req.json<{ email: string }>()

    const licenseData = {
        email,
        transactionId: `manual-${String(Date.now())}`,
        issuedAt: new Date().toISOString(),
    }

    const licenseKey = await generateLicenseKey(licenseData, c.env.ED25519_PRIVATE_KEY)
    const formattedKey = formatLicenseKey(licenseKey)

    return c.json({ licenseKey: formattedKey })
})

export default app
