from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta, date


class Company(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    trial_end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def is_on_trial(self):
        if not self.trial_end_date:
            return False
        return date.today() <= self.trial_end_date

    @property
    def trial_days_remaining(self):
        if not self.trial_end_date:
            return 0
        delta = self.trial_end_date - date.today()
        return max(0, delta.days)

    def get_active_subscription(self):
        """Returns the currently active subscription or None."""
        return self.subscriptions.filter(
            status__in=['trial', 'active'],
            start_date__lte=date.today(),
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=date.today())
        ).first()

    def has_active_subscription(self):
        """Check if company has any active subscription (trial or paid)."""
        sub = self.get_active_subscription()
        return sub is not None


class Organisation(models.Model):
    name = models.CharField(max_length=255)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="organisations")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('supervisor', 'Supervisor'),
        ('guard', 'Guard'),
    )

    # Remove the inherited `username` field from AbstractUser
    username = None

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="users", null=True, blank=True)
    payroll_code = models.CharField(max_length=100, null=True, blank=True)
    off_days = models.PositiveIntegerField(default=0)
    qualifications = models.TextField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)


class BillingPlan(models.Model):
    """
    Defines the available subscription plans/tiers.
    Admins create these; companies subscribe to them.
    """
    PLAN_TIERS = (
        ('free', 'Free'),
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    )
    BILLING_CYCLES = (
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('biannual', 'Bi-Annual'),
        ('annual', 'Annual'),
    )

    name = models.CharField(max_length=100)
    tier = models.CharField(max_length=20, choices=PLAN_TIERS, default='free')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    # Pricing per billing cycle
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quarterly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    biannual_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    annual_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Feature limits
    max_guards = models.PositiveIntegerField(default=5, help_text="0 = unlimited")
    max_sites = models.PositiveIntegerField(default=1, help_text="0 = unlimited")
    max_checkpoints = models.PositiveIntegerField(default=10, help_text="0 = unlimited")
    max_visitors_per_month = models.PositiveIntegerField(default=0, help_text="0 = unlimited")
    has_analytics = models.BooleanField(default=False)
    has_reports = models.BooleanField(default=False)
    has_api_access = models.BooleanField(default=False)
    has_priority_support = models.BooleanField(default=False)
    has_white_label = models.BooleanField(default=False)

    # Trial allowance
    trial_days = models.PositiveIntegerField(default=14)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['monthly_price']

    def __str__(self):
        return f"{self.name} ({self.get_tier_display()})"

    def get_price_for_cycle(self, billing_cycle):
        """Returns the price for a given billing cycle."""
        mapping = {
            'monthly': self.monthly_price,
            'quarterly': self.quarterly_price,
            'biannual': self.biannual_price,
            'annual': self.annual_price,
        }
        return mapping.get(billing_cycle, self.monthly_price)


class Subscription(models.Model):
    STATUS_CHOICES = (
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
    )
    CYCLE_CHOICES = (
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('biannual', 'Bi-Annual'),
        ('annual', 'Annual'),
    )

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(BillingPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    billing_cycle = models.CharField(max_length=20, choices=CYCLE_CHOICES, default='monthly')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)

    # Payment tracking
    payment_method = models.CharField(max_length=100, blank=True, null=True)
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    next_billing_date = models.DateField(null=True, blank=True)
    last_billing_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        plan_name = self.plan.name if self.plan else "No Plan"
        return f"{self.company.name} - {plan_name} ({self.get_status_display()})"

    def is_expired(self):
        if not self.end_date:
            return False
        return date.today() > self.end_date

    def days_until_expiry(self):
        if not self.end_date:
            return None
        delta = self.end_date - date.today()
        return max(0, delta.days)

    def mark_expired(self):
        """Mark this subscription as expired."""
        self.status = 'expired'
        self.save(update_fields=['status'])

    def cancel(self):
        """Cancel this subscription."""
        self.status = 'cancelled'
        self.cancelled_at = timezone.now()
        self.auto_renew = False
        self.save(update_fields=['status', 'cancelled_at', 'auto_renew'])

    def renew(self):
        """Renew for another billing cycle period."""
        if not self.end_date:
            return

        cycle_days = {
            'monthly': 30,
            'quarterly': 90,
            'biannual': 180,
            'annual': 365,
        }
        days = cycle_days.get(self.billing_cycle, 30)

        self.start_date = self.end_date
        self.end_date = self.end_date + timedelta(days=days)
        self.last_billing_date = date.today()
        self.next_billing_date = self.end_date
        self.status = 'active'
        self.save()


class Payment(models.Model):
    """
    Tracks all payments made by a company for subscriptions.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="billing_payments")
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    payment_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=100, blank=True, null=True)
    reference = models.CharField(max_length=255, blank=True, null=True, help_text="External payment gateway reference")
    description = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.company.name} - {self.amount} {self.currency} ({self.get_status_display()})"


class Invoice(models.Model):
    """
    Invoices generated for subscription payments.
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    )

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="billing_invoices")
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    payment = models.OneToOneField(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice")
    invoice_number = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    description = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.company.name}"


# attach the custom manager
User.add_to_class('objects', UserManager())