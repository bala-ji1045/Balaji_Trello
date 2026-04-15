from boards.models import Board
import uuid
from datetime import timedelta
from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django.db.models import Q
from django.utils import timezone
from users.models import User


class Project(models.Model):
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='owned_projects')
    title = models.CharField(max_length=255, blank=False, null=False)
    description = models.TextField(blank=True, null=False)
    created_at = models.DateTimeField(default=timezone.now)
    members = models.ManyToManyField(
        User, through='ProjectMembership', through_fields=('project', 'member'))

    boards = GenericRelation(
        Board, object_id_field='owner_id', content_type_field='owner_model')

    def __str__(self):
        return self.title


class ProjectMembership(models.Model):
    class Access(models.IntegerChoices):
        MEMBER = 1            # Can view and create and move only own items
        ADMIN = 2             # Can remove members and modify project settings.

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE)
    member = models.ForeignKey(
        User, on_delete=models.CASCADE)
    access_level = models.IntegerField(choices=Access.choices, default=1)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.member.full_name} , {self.project.title}'

    class Meta:
        unique_together = ('project', 'member')


def _default_invite_expiry():
    return timezone.now() + timedelta(hours=24)


class ProjectInvitation(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name='invitations')
    invited_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='project_invitations')
    invited_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sent_project_invitations')
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(default=_default_invite_expiry)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'invited_user'],
                condition=Q(accepted_at__isnull=True),
                name='unique_active_project_invite_per_user',
            )
        ]

    def is_expired(self):
        return self.expires_at <= timezone.now()
