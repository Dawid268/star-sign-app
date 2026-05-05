import crypto from 'node:crypto';

type StripeEvent = {
  type: string;
  data?: {
    object?: Record<string, any>;
  };
};

type SubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';
type SubscriptionPlan = 'monthly' | 'annual' | null;

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const UNPARSED_BODY_SYMBOL = Symbol.for('unparsedBody');

const timingSafeEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyStripeSignature = (
  payload: string,
  signatureHeader: string,
  secret: string,
): boolean => {
  const pairs = signatureHeader
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split('=') as [string, string]);

  const timestamp = Number(pairs.find(([key]) => key === 't')?.[1]);
  const signatures = pairs
    .filter(([key]) => key === 'v1')
    .map(([, value]) => value);

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return signatures.some((signature) => timingSafeEquals(signature, expected));
};

const getRawBody = (ctx: any): string => {
  const rawFromKoaBody = ctx.request.body?.[UNPARSED_BODY_SYMBOL];
  if (rawFromKoaBody) {
    return rawFromKoaBody.toString('utf8');
  }

  if (typeof ctx.request.rawBody === 'string') {
    return ctx.request.rawBody;
  }

  return '';
};

const toIsoFromUnix = (value: unknown): string | null => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }
  return new Date(numericValue * 1000).toISOString();
};

const normalizeSubscriptionStatus = (status: unknown): SubscriptionStatus => {
  if (
    status === 'trialing' ||
    status === 'active' ||
    status === 'past_due' ||
    status === 'canceled' ||
    status === 'unpaid'
  ) {
    return status;
  }
  return 'inactive';
};

const resolveSubscriptionPlan = (
  subscription: Record<string, any>,
): SubscriptionPlan => {
  const metadataPlan = subscription?.metadata?.plan;
  if (metadataPlan === 'monthly' || metadataPlan === 'annual') {
    return metadataPlan;
  }

  const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval;
  if (interval === 'year') {
    return 'annual';
  }
  if (interval === 'month') {
    return 'monthly';
  }
  return null;
};

const ensureUserProfileForUser = async (userId: number): Promise<any> => {
  let profile = await strapi.db
    .query('api::user-profile.user-profile')
    .findOne({
      where: { user: userId },
    });

  if (profile) {
    return profile;
  }

  profile = await strapi.db.query('api::user-profile.user-profile').create({
    data: {
      user: userId,
      subscription_status: 'inactive',
      marketing_consent: false,
    },
  });

  return profile;
};

const findUserProfileByStripe = async (input: {
  customerId?: string | null;
  subscriptionId?: string | null;
}) => {
  if (input.customerId) {
    const byCustomer = await strapi.db
      .query('api::user-profile.user-profile')
      .findOne({
        where: { stripe_customer_id: input.customerId },
      });
    if (byCustomer) {
      return byCustomer;
    }
  }

  if (input.subscriptionId) {
    const bySubscription = await strapi.db
      .query('api::user-profile.user-profile')
      .findOne({
        where: { stripe_subscription_id: input.subscriptionId },
      });
    if (bySubscription) {
      return bySubscription;
    }
  }

  return null;
};

const updateUserProfileSubscription = async (input: {
  profileId: number;
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}) => {
  const patch: Record<string, unknown> = {
    last_synced_at: new Date().toISOString(),
  };

  if (typeof input.customerId === 'string' && input.customerId.length) {
    patch.stripe_customer_id = input.customerId;
  }
  if (typeof input.subscriptionId === 'string' && input.subscriptionId.length) {
    patch.stripe_subscription_id = input.subscriptionId;
  }
  if (input.status) {
    patch.subscription_status = input.status;
  }
  if (input.plan) {
    patch.subscription_plan = input.plan;
  }
  if (typeof input.cancelAtPeriodEnd === 'boolean') {
    patch.cancel_at_period_end = input.cancelAtPeriodEnd;
  }
  if (input.trialEndsAt !== undefined) {
    patch.trial_ends_at = input.trialEndsAt;
  }
  if (input.currentPeriodEnd !== undefined) {
    patch.current_period_end = input.currentPeriodEnd;
  }

  await strapi.db.query('api::user-profile.user-profile').update({
    where: { id: input.profileId },
    data: patch,
  });
};

export default {
  async webhook(ctx: any) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      ctx.status = 503;
      ctx.body = { error: 'Webhook Stripe nie jest skonfigurowany.' };
      return;
    }

    const signature = ctx.get('stripe-signature');
    if (!signature) {
      return ctx.badRequest('Brak podpisu Stripe.');
    }

    const rawBody = getRawBody(ctx);
    if (!rawBody) {
      return ctx.badRequest('Brak surowej treści żądania.');
    }

    if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
      return ctx.badRequest('Nieprawidłowy podpis Stripe.');
    }

    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody) as StripeEvent;
    } catch {
      return ctx.badRequest('Nieprawidłowy payload Stripe.');
    }
    const eventType = event.type;
    const object = event.data?.object || {};

    if (eventType === 'checkout.session.completed') {
      const sessionId = typeof object.id === 'string' ? object.id : '';
      const mode = typeof object.mode === 'string' ? object.mode : '';

      if (sessionId) {
        if (mode === 'payment') {
          const order = await strapi.db.query('api::order.order').findOne({
            where: { stripe_session_id: sessionId },
          });

          if (order && order.status !== 'paid') {
            await strapi.db.query('api::order.order').update({
              where: { id: order.id },
              data: {
                status: 'paid',
                stripe_payment_intent_id:
                  typeof object.payment_intent === 'string'
                    ? object.payment_intent
                    : null,
                paid_at: new Date().toISOString(),
              },
            });
          }
        }

        if (mode === 'subscription') {
          const customerId =
            typeof object.customer === 'string' ? object.customer : null;
          const subscriptionId =
            typeof object.subscription === 'string'
              ? object.subscription
              : null;
          const sessionPlan =
            object?.metadata?.plan === 'annual'
              ? 'annual'
              : object?.metadata?.plan === 'monthly'
                ? 'monthly'
                : null;
          const clientReferenceId = Number(object?.client_reference_id);
          const metadataUserId = Number(object?.metadata?.userId);
          const userId =
            Number.isFinite(clientReferenceId) && clientReferenceId > 0
              ? clientReferenceId
              : Number.isFinite(metadataUserId) && metadataUserId > 0
                ? metadataUserId
                : null;

          let profile = await findUserProfileByStripe({
            customerId,
            subscriptionId,
          });

          if (!profile && userId) {
            profile = await ensureUserProfileForUser(userId);
          }

          if (profile) {
            await updateUserProfileSubscription({
              profileId: profile.id,
              customerId,
              subscriptionId,
              status: 'trialing',
              plan: sessionPlan,
            });
          } else {
            strapi.log.warn(
              'Nie udało się powiązać zdarzenia checkout.session.completed z profilem użytkownika.',
            );
          }
        }
      }
    }

    if (eventType === 'checkout.session.expired') {
      const sessionId = typeof object.id === 'string' ? object.id : '';
      if (sessionId) {
        const order = await strapi.db.query('api::order.order').findOne({
          where: { stripe_session_id: sessionId },
        });

        if (order && order.status === 'pending') {
          await strapi.db.query('api::order.order').update({
            where: { id: order.id },
            data: { status: 'cancelled' },
          });
        }
      }
    }

    if (
      eventType === 'customer.subscription.created' ||
      eventType === 'customer.subscription.updated' ||
      eventType === 'customer.subscription.deleted'
    ) {
      const customerId =
        typeof object.customer === 'string' ? object.customer : null;
      const subscriptionId = typeof object.id === 'string' ? object.id : null;

      let profile = await findUserProfileByStripe({
        customerId,
        subscriptionId,
      });

      if (!profile) {
        const metadataUserId = Number(object?.metadata?.userId);
        if (Number.isFinite(metadataUserId) && metadataUserId > 0) {
          profile = await ensureUserProfileForUser(metadataUserId);
        }
      }

      if (profile) {
        await updateUserProfileSubscription({
          profileId: profile.id,
          customerId,
          subscriptionId,
          status: normalizeSubscriptionStatus(object.status),
          plan: resolveSubscriptionPlan(object),
          trialEndsAt: toIsoFromUnix(object.trial_end),
          currentPeriodEnd: toIsoFromUnix(object.current_period_end),
          cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        });
      } else {
        strapi.log.warn(
          `Nie udało się powiązać zdarzenia subskrypcji Stripe (${eventType}) z profilem użytkownika.`,
        );
      }
    }

    ctx.body = { received: true };
  },
};
