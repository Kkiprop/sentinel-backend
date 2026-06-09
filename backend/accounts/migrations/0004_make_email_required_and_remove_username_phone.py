from django.db import migrations, models


def populate_emails(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    db_alias = schema_editor.connection.alias
    for u in User.objects.using(db_alias).all():
        if not u.email:
            # Prefer existing username or phone if present, else fallback to user{pk}@example.com
            candidate = None
            uname = getattr(u, 'username', None)
            phone = getattr(u, 'phone', None)
            if uname:
                candidate = f"{uname}@example.com"
            elif phone:
                # sanitize phone for email local part
                local = ''.join(ch for ch in str(phone) if ch.isalnum())
                candidate = f"{local}@example.com"
            else:
                candidate = f"user{u.pk}@example.com"

            # Ensure uniqueness
            base_local, base_domain = candidate.split('@')
            cur = candidate
            i = 1
            while User.objects.using(db_alias).filter(email=cur).exclude(pk=u.pk).exists():
                cur = f"{base_local}+{i}@{base_domain}"
                i += 1
            u.email = cur
            u.save(update_fields=['email'])


def reverse_populate_emails(apps, schema_editor):
    # Irreversible
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_alter_user_email_alter_user_phone_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_emails, reverse_populate_emails),
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(unique=True, max_length=254),
        ),
        migrations.RemoveField(
            model_name='user',
            name='username',
        ),
        migrations.RemoveField(
            model_name='user',
            name='phone',
        ),
    ]
