/* ===== STRIPE WEBHOOK — Cloud Function =====
   Fires when a Stripe checkout.session.completed event arrives.
   Looks up the Firebase user by email → sets plan to Pro in Firestore.
   ============================================ */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const stripe    = require('stripe');

admin.initializeApp();
const db = admin.firestore();

// Price IDs from your Stripe dashboard (Payment Links → Price ID)
// Update these after you check your Stripe dashboard
const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY || '';
const PRICE_ANNUAL  = process.env.STRIPE_PRICE_ANNUAL  || '';

/* ─── Stripe Webhook Handler ─────────────────────────────────── */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {

    // Only accept POST
    if (req.method !== 'POST') { return res.status(405).send('Method Not Allowed'); }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeClient  = stripe(process.env.STRIPE_SECRET_KEY);

    // Verify the event came from Stripe (not a fake POST)
    let event;
    try {
        event = stripeClient.webhooks.constructEvent(
            req.rawBody,                          // Firebase provides rawBody automatically
            req.headers['stripe-signature'],
            webhookSecret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Only handle successful checkouts
    if (event.type !== 'checkout.session.completed') {
        return res.status(200).send('Ignored');
    }

    const session = event.data.object;
    const email   = (session.customer_details && session.customer_details.email)
                  || session.customer_email;

    if (!email) {
        console.error('No email in session:', session.id);
        return res.status(200).send('No email — skipped');
    }

    // Determine plan type from the line items price ID
    let planType = 'monthly'; // default
    try {
        const lineItems = await stripeClient.checkout.sessions.listLineItems(session.id, { limit: 1 });
        if (lineItems.data.length > 0) {
            const priceId = lineItems.data[0].price.id;
            if (priceId === PRICE_ANNUAL) planType = 'annual';
        }
    } catch (err) {
        console.warn('Could not fetch line items, defaulting to monthly:', err.message);
    }

    // Calculate plan expiry
    const now    = new Date();
    const expiry = new Date(now);
    if (planType === 'annual') {
        expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
        expiry.setMonth(expiry.getMonth() + 1);
    }

    // Look up Firebase user by email
    let uid;
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        uid = userRecord.uid;
    } catch (err) {
        console.error('Firebase user not found for email:', email, err.message);
        // Store a pending upgrade by email so user gets it on next login
        await db.collection('pendingUpgrades').doc(email.replace('@', '_at_')).set({
            email,
            plan: 'pro',
            planType,
            planExpiry: admin.firestore.Timestamp.fromDate(expiry),
            stripeSessionId: session.id,
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: session.subscription || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).send('Pending upgrade stored — user not yet registered');
    }

    // Update user in Firestore
    await db.collection('users').doc(uid).set({
        plan: 'pro',
        planType,
        planExpiry: admin.firestore.Timestamp.fromDate(expiry),
        stripeCustomerId: session.customer || null,
        stripeSubscriptionId: session.subscription || null,
        upgradedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Upgraded ${email} (${uid}) to Pro ${planType} — expires ${expiry.toISOString()}`);
    return res.status(200).send('OK');
});


/* ─── Pending Upgrade Claim (runs on login) ───────────────────
   When a user signs in, check if there's a pending upgrade for
   their email (paid before creating an account).
   Call this from your app after auth.onAuthStateChanged.
   ─────────────────────────────────────────────────────────── */
exports.claimPendingUpgrade = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');

    const uid   = context.auth.uid;
    const email = context.auth.token.email;
    if (!email) return { claimed: false };

    const key     = email.replace('@', '_at_');
    const pending = await db.collection('pendingUpgrades').doc(key).get();
    if (!pending.exists) return { claimed: false };

    const d = pending.data();

    // Apply the upgrade
    await db.collection('users').doc(uid).set({
        plan: d.plan,
        planType: d.planType,
        planExpiry: d.planExpiry,
        stripeCustomerId: d.stripeCustomerId || null,
        stripeSubscriptionId: d.stripeSubscriptionId || null,
        upgradedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Remove the pending record
    await db.collection('pendingUpgrades').doc(key).delete();

    console.log(`✅ Claimed pending upgrade for ${email} (${uid})`);
    return { claimed: true, planType: d.planType };
});
