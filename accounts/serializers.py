from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User, Company, Organisation, Subscription


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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "is_active"]


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


class SubscriptionSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            "id",
            "company",
            "company_name",
            "plan",
            "status",
            "amount",
            "start_date",
            "end_date",
            "auto_renew",
            "payment_method",
            "payment_reference",
            "notes",
            "days_remaining",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "company_name", "days_remaining"]

    def get_days_remaining(self, obj):
        if obj.end_date:
            delta = obj.end_date - obj.start_date
            return delta.days
        return None