from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.translation import gettext_lazy as _

from .models import User, Company


class CustomUserCreationForm(UserCreationForm):
	class Meta(UserCreationForm.Meta):
		model = User
		fields = ("email", "role", "company")

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		# require company to be set in the admin UI
		if 'company' in self.fields:
			self.fields['company'].required = True


class CustomUserChangeForm(UserChangeForm):
	class Meta(UserChangeForm.Meta):
		model = User
		fields = ("email", "role", "company")

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		# require company to be set in the admin UI when editing/creating users
		if 'company' in self.fields:
			self.fields['company'].required = True


class UserAdmin(BaseUserAdmin):
	add_form = CustomUserCreationForm
	form = CustomUserChangeForm
	model = User
	list_display = ("email", "role", "company", "is_staff")
	list_filter = ("role", "is_staff", "is_superuser", "is_active")
	ordering = ("email",)
	search_fields = ("email",)
	fieldsets = (
		(None, {"fields": ("email", "password")} ),
		(_("Personal info"), {"fields": ("first_name", "last_name")} ),
		(_("Company info"), {"fields": ("role", "company")} ),
		(_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")} ),
		(_("Important dates"), {"fields": ("last_login", "date_joined")} ),
	)
	add_fieldsets = (
		(None, {
			"classes": ("wide",),
			"fields": ("email", "password1", "password2", "role", "company"),
		}),
	)


admin.site.register(User, UserAdmin)
admin.site.register(Company)
