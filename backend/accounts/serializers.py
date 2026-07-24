import re

from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User, Company, Organisation, BillingPlan, Subscription, Payment, Invoice


class WebsiteField(serializers.URLField):
    default_error_messages = {'invalid': 'Enter a valid URL.'}

    def to_internal_value(self, data):
        if data is None:
            return None
        if isinstance(data, str):
            data = data.strip()
            if data == "":
                return ""
            if not re.match(r'^[a-zA-Z][a-zA-Z0-9+\-.]*://', data):
                data = f"https://{data}"
        return super().to_internal_value(data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(
            username=email,
            password=password
        )

        if not user:
            raise serializers.ValidationError(
                "Invalid credentials"
            )

        attrs["user"] = user
        return attrs


class CompanySerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True, use_url=True)
    is_on_trial = serializers.BooleanField(read_only=True)
    trial_days_remaining = serializers.IntegerField(read_only=True)
    website = serializers.URLField(allow_blank=True, required=False)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "address",
            "website",
            "logo",
            "description",
            "is_active",
            "trial_end_date",
            "is_on_trial",
            "trial_days_remaining",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "is_active", "is_on_trial", "trial_days_remaining"]

    def to_internal_value(self, data):
        if isinstance(data, dict) and 'logo' in data and isinstance(data['logo'], str):
            data = data.copy()
            data.pop('logo')
        return super().to_internal_value(data)


class OrganisationSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source='company_id', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "company_id",
            "company_name",
        ]


class UserSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        allow_null=True,
        required=False,
    )

    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "company",
            "date_joined",
            "payroll_code",
            "off_days",
            "qualifications",
            "password",
        ]

        read_only_fields = ["date_joined"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class BillingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingPlan
        fields = [
            "id",
            "name",
            "tier",
            "description",
            "is_active",
            "monthly_price",
            "quarterly_price",
            "biannual_price",
            "annual_price",
            "max_guards",
            "max_sites",
            "max_checkpoints",
            "max_visitors_per_month",
            "has_analytics",
            "has_reports",
            "has_api_access",
            "has_priority_support",
            "has_white_label",
            "trial_days",
            "created_at",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_tier = serializers.CharField(source='plan.tier', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "company",
            "company_name",
            "plan",
            "plan_name",
            "plan_tier",
            "status",
            "billing_cycle",
            "amount",
            "start_date",
            "end_date",
            "cancelled_at",
            "auto_renew",
            "payment_method",
            "payment_reference",
            "next_billing_date",
            "last_billing_date",
            "notes",
            "days_remaining",
            "is_expired",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at", "updated_at", "company_name", "plan_name", "plan_tier",
            "days_remaining", "is_expired", "cancelled_at",
        ]

    def get_days_remaining(self, obj):
        return obj.days_until_expiry()


class PaymentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "company",
            "company_name",
            "subscription",
            "amount",
            "currency",
            "payment_date",
            "status",
            "payment_method",
            "reference",
            "description",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at", "company_name"]


class InvoiceSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "company",
            "company_name",
            "subscription",
            "payment",
            "invoice_number",
            "amount",
            "currency",
            "issue_date",
            "due_date",
            "status",
            "description",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at", "company_name"]