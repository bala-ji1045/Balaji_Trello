from datetime import timedelta

from boards.models import Notification
from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.db.models import Case, When
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from projects.models import Project, ProjectInvitation, ProjectMembership
from projects.permissions import IsProjectAdminOrMemberReadOnly
from projects.serializers import ProjectMembershipSerializer, ProjectSerializer, ShortProjectSerializer
from rest_framework import generics, mixins, status
from rest_framework.response import Response
from rest_framework.views import APIView
from users.models import User


class ProjectList(mixins.ListModelMixin, mixins.CreateModelMixin,
                  generics.GenericAPIView):

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ShortProjectSerializer 

        return ProjectSerializer

    def get_queryset(self):
        # Sort by access_level so projects where you're admin at top
        project_ids = ProjectMembership.objects.filter(
            member=self.request.user).order_by('-access_level').values_list('project__id', flat=True)

        preserved = Case(*[When(pk=pk, then=pos)
                           for pos, pk in enumerate(project_ids)])
        return Project.objects.filter(pk__in=project_ids).order_by(preserved)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class ProjectDetail(APIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsProjectAdminOrMemberReadOnly]

    def get(self, request, pk):
        proj = get_object_or_404(Project, pk=pk)
        self.check_object_permissions(self.request, proj)
        serializer = ProjectSerializer(proj)
        return Response(serializer.data)

    def put(self, request, pk):
        proj = get_object_or_404(Project, pk=pk)
        self.check_object_permissions(self.request, proj)
        if 'owner' in request.data:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        serializer = ProjectSerializer(proj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        proj = get_object_or_404(Project, pk=pk)
        self.check_object_permissions(self.request, proj)
        proj.delete()
        return Response(status=status.HTTP_200_OK)


class ProjectMemberList(mixins.ListModelMixin,
                        generics.GenericAPIView,
                        mixins.CreateModelMixin):
    serializer_class = ProjectMembershipSerializer
    permission_classes = [IsProjectAdminOrMemberReadOnly]

    def get_queryset(self):
        try:
            project = Project.objects.get(pk=self.kwargs['pk'])
            query_set = ProjectMembership.objects.filter(project=project)
        except:
            raise Http404
        return query_set

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)


class ProjectMemberDetail(APIView):
    serializer_class = ProjectMembershipSerializer
    permission_classes = [IsProjectAdminOrMemberReadOnly]

    def get_object(self, pk):
        obj = get_object_or_404(ProjectMembership, pk=pk)
        self.check_object_permissions(self.request, obj.project)
        return obj

    def put(self, request, pk):
        pmem = self.get_object(pk)
        serializer = ProjectMembershipSerializer(
            pmem, data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()

            # Notification
            if request.data['access_level'] == 2:
                Notification.objects.create(
                    actor=request.user,
                    recipient=pmem.member,
                    verb='made you admin of',
                    target_model=ContentType.objects.get_for_model(Project),
                    target_id=pmem.project.id,
                )
            else:
                Notification.objects.filter(
                    verb='made you admin of', recipient=pmem.member,
                    target_model=ContentType.objects.get(model='project'), target_id=pmem.project.id).delete()

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        pmem = self.get_object(pk)
        pmem.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


site_url = "http://localhost:3000/"

_INVITE_EXPIRY = timedelta(hours=24)


class SendProjectInvite(APIView):
    permission_classes = [IsProjectAdminOrMemberReadOnly]

    def get_object(self, pk):
        project = get_object_or_404(Project, pk=pk)
        self.check_object_permissions(self.request, project)
        return project

    def post(self, request, pk):
        project = self.get_object(pk)
        users = request.data.get('users', None)

        if users is None:
            return Response({'error': 'No users provided'}, status=status.HTTP_400_BAD_REQUEST)
        project_ct = ContentType.objects.get_for_model(Project)
        invite_ct = ContentType.objects.get_for_model(ProjectInvitation)
        for username_or_email in users:
            user = User.objects.filter(username=username_or_email).first()
            if user is None:
                user = User.objects.filter(email=username_or_email).first()
            if user is None:
                continue

            # Can't invite a member
            if (
                ProjectMembership.objects.filter(project=project, member=user).exists()
                or project.owner == user
            ):
                continue

            # Ensure only one active invite per (project, user)
            ProjectInvitation.objects.filter(
                project=project,
                invited_user=user,
                accepted_at__isnull=True,
            ).delete()

            invitation = ProjectInvitation.objects.create(
                project=project,
                invited_user=user,
                invited_by=request.user,
                expires_at=timezone.now() + _INVITE_EXPIRY,
            )

            subject = f'{request.user.full_name} has invited you to join {project.title}'
            message = (f'Click on the following link to accept: {site_url}projects/join'
                       f'/{invitation.token}')

            # if from_email=None, uses DEFAULT_FROM_EMAIL from settings.py
            try:
                send_mail(subject, message, from_email=None,
                          recipient_list=[user.email])
            except Exception:
                pass

            # Notification (attach invitation as action_object so frontend can accept)
            Notification.objects.create(
                actor=request.user,
                recipient=user,
                verb='invited you to',
                target_model=project_ct,
                target_id=project.id,
                action_object_model=invite_ct,
                action_object_id=invitation.id,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AcceptProjectInvite(APIView):
    def post(self, request, token, format=None):
        invitation = ProjectInvitation.objects.filter(token=token).select_related('project', 'invited_user').first()
        if invitation is None:
            return Response({'error': 'Invalid invitation token'}, status=status.HTTP_400_BAD_REQUEST)

        if invitation.accepted_at is not None:
            return Response({'error': 'Invitation already used'}, status=status.HTTP_400_BAD_REQUEST)

        if invitation.is_expired():
            return Response({'error': 'Invitation expired'}, status=status.HTTP_400_BAD_REQUEST)

        if invitation.invited_user_id != request.user.id:
            return Response({'error': 'This invitation is not for the current user'}, status=status.HTTP_403_FORBIDDEN)

        project = invitation.project
        if ProjectMembership.objects.filter(project=project, member=request.user).exists():
            return Response({'error': 'User is already a member of this project'}, status=status.HTTP_400_BAD_REQUEST)

        ProjectMembership.objects.create(project=project, member=request.user)
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=['accepted_at'])

        # Notification
        Notification.objects.filter(
            verb='invited you to',
            recipient=request.user,
            target_model=ContentType.objects.get(model='project'),
            target_id=project.id,
            action_object_model=ContentType.objects.get_for_model(ProjectInvitation),
            action_object_id=invitation.id,
        ).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
