from django.db import migrations, models

import patrols.models


class Migration(migrations.Migration):

    dependencies = [
        ('patrols', '0005_incident_attachment_incident_audio_incident_video'),
    ]

    operations = [
        migrations.AlterField(
            model_name='checkpoint',
            name='qr_code',
            field=models.CharField(blank=True, default=patrols.models.generate_checkpoint_qr_value, max_length=255, unique=True),
        ),
        migrations.AddField(
            model_name='patrollog',
            name='checkpoint_latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='patrollog',
            name='checkpoint_longitude',
            field=models.FloatField(blank=True, null=True),
        ),
    ]