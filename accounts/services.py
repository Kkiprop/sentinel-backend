from django.utils import timezone
from datetime import timedelta, date
from .models import Company, BillingPlan, Subscription, Payment, Invoice


TRIAL_DURATION_DAYS = 14


def start_trial(company, plan=None):
    """
    Start a trial subscription for a company.
    If no plan specified, uses the first available free plan or creates a trial subscription.
    """
    # End any existing active/trial subscriptions
    Subscription.objects.filter(
        company=company,
        status__in=['trial', 'active']
    ).update(status='expired')

    if not plan:
        plan = BillingPlan.objects.filter(tier='free', is_active=True).first()

    trial_end = date.today() + timedelta(days=TRIAL_DURATION_DAYS)

    subscription = Subscription.objects.create(
        company=company,
        plan=plan,
        status='trial',
        billing_cycle='monthly',
        amount=0,
        start_date=date.today(),
        end_date=trial_end,
        auto_renew=False,
    )

    # Also set company trial end date
    company.trial_end_date = trial_end
    company.save(update_fields=['trial_end_date'])

    return subscription


def activate_subscription(company, plan, billing_cycle='monthly', payment_method=None, payment_reference=None):
    """
    Activate a paid subscription for a company.
    """
    # End any existing active/trial subscriptions
    Subscription.objects.filter(
        company=company,
        status__in=['trial', 'active']
    ).update(status='expired')

    amount = plan.get_price_for_cycle(billing_cycle)
    cycle_days = {'monthly': 30, 'quarterly': 90, 'biannual': 180, 'annual': 365}
    days = cycle_days.get(billing_cycle, 30)

    end_date = date.today() + timedelta(days=days)

    subscription = Subscription.objects.create(
        company=company,
        plan=plan,
        status='active',
        billing_cycle=billing_cycle,
        amount=amount,
        start_date=date.today(),
        end_date=end_date,
        auto_renew=True,
        payment_method=payment_method,
        payment_reference=payment_reference,
        next_billing_date=end_date,
        last_billing_date=date.today(),
    )

    # Create a payment record
    payment = Payment.objects.create(
        company=company,
        subscription=subscription,
        amount=amount,
        status='completed',
        payment_method=payment_method,
        reference=payment_reference,
        description=f"{plan.name} - {billing_cycle} subscription",
    )

    # Create an invoice
    invoice_number = f"INV-{company.id:04d}-{subscription.id:06d}"
    Invoice.objects.create(
        company=company,
        subscription=subscription,
        payment=payment,
        invoice_number=invoice_number,
        amount=amount,
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=7),
        status='paid',
        description=f"{plan.name} - {billing_cycle} subscription payment",
    )

    return subscription


def cancel_subscription(subscription):
    """Cancel an active subscription."""
    subscription.cancel()
    return subscription


def check_subscription_access(company):
    """
    Check if a company has access to the system.
    Returns dict with access status and details.
    """
    if not company.is_active:
        return {
            'has_access': False,
            'reason': 'Account deactivated',
            'status': 'deactivated',
        }

    active_sub = company.get_active_subscription()

    if active_sub:
        return {
            'has_access': True,
            'reason': None,
            'status': active_sub.status,
            'plan_name': active_sub.plan.name if active_sub.plan else None,
            'days_remaining': active_sub.days_until_expiry(),
        }

    # Check if trial has expired
    if company.trial_end_date and date.today() > company.trial_end_date:
        return {
            'has_access': False,
            'reason': 'Trial period has ended. Please subscribe to continue.',
            'status': 'trial_expired',
        }

    # No subscription at all - start trial
    return {
        'has_access': True,
        'reason': 'Trial mode',
        'status': 'no_subscription',
    }


def process_expired_subscriptions():
    """
    Cron job: Mark all expired subscriptions as expired.
    Returns count of subscriptions expired.
    """
    expired = Subscription.objects.filter(
        status__in=['trial', 'active'],
        end_date__lt=date.today(),
    )
    count = expired.count()
    for sub in expired:
        sub.mark_expired()
    return count


def get_billing_history(company, limit=12):
    """Get billing history for a company."""
    payments = Payment.objects.filter(company=company)[:limit]
    return payments