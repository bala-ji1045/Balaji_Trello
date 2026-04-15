from __future__ import annotations

from dataclasses import dataclass

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from django.utils import timezone

from boards.models import Board, Comment, Item, List
from projects.models import Project, ProjectMembership
from users.models import User


@dataclass(frozen=True)
class SeedResult:
    projects_created: int = 0
    boards_created: int = 0
    lists_created: int = 0
    items_created: int = 0
    comments_created: int = 0


class Command(BaseCommand):
    help = "Seed demo data (project/boards/lists/cards) for local development."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default="demo",
            help="Username to seed data for (default: demo)",
        )

    def handle(self, *args, **options):
        username: str = options["username"]

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"User '{username}' not found. Create the user first."))
            return

        result = SeedResult()

        # Project
        project, project_created = Project.objects.get_or_create(
            owner=user,
            title="Demo Project",
            defaults={"description": "A sample team/project with one board."},
        )
        if not project_created and project.description.strip() == "":
            project.description = "A sample team/project with one board."
            project.save(update_fields=["description"])

        if project_created:
            result = SeedResult(projects_created=result.projects_created + 1,
                                boards_created=result.boards_created,
                                lists_created=result.lists_created,
                                items_created=result.items_created,
                                comments_created=result.comments_created)

        ProjectMembership.objects.get_or_create(
            project=project,
            member=user,
            defaults={"access_level": ProjectMembership.Access.ADMIN},
        )

        # Boards
        user_ct = ContentType.objects.get_for_model(User)
        project_ct = ContentType.objects.get_for_model(Project)

        personal_board, personal_created = Board.objects.get_or_create(
            owner_model=user_ct,
            owner_id=user.id,
            title="Getting Started",
            defaults={
                "description": "A personal board with sample lists and cards.",
                "color": "61bd4f",
                "image_url": "",
            },
        )
        if personal_created:
            result = SeedResult(projects_created=result.projects_created,
                                boards_created=result.boards_created + 1,
                                lists_created=result.lists_created,
                                items_created=result.items_created,
                                comments_created=result.comments_created)

        project_board, project_board_created = Board.objects.get_or_create(
            owner_model=project_ct,
            owner_id=project.id,
            title="Demo Team Board",
            defaults={
                "description": "A project board shared with the team.",
                "color": "4680ff",
                "image_url": "",
            },
        )
        if project_board_created:
            result = SeedResult(projects_created=result.projects_created,
                                boards_created=result.boards_created + 1,
                                lists_created=result.lists_created,
                                items_created=result.items_created,
                                comments_created=result.comments_created)

        # Lists + Items
        result = self._seed_board(personal_board, user, result)
        result = self._seed_board(project_board, user, result)

        self.stdout.write(self.style.SUCCESS("Seed complete."))
        self.stdout.write(
            f"Projects created: {result.projects_created}\n"
            f"Boards created: {result.boards_created}\n"
            f"Lists created: {result.lists_created}\n"
            f"Items created: {result.items_created}\n"
            f"Comments created: {result.comments_created}"
        )

    def _seed_board(self, board: Board, user: User, result: SeedResult) -> SeedResult:
        todo, todo_created = List.objects.get_or_create(board=board, title="To Do")
        doing, doing_created = List.objects.get_or_create(board=board, title="Doing")
        done, done_created = List.objects.get_or_create(board=board, title="Done")

        lists_created = result.lists_created + int(todo_created) + int(doing_created) + int(done_created)

        item1, item1_created = Item.objects.get_or_create(
            list=todo,
            title="Create your first board",
            defaults={
                "description": "Use the + Create button to make a new board.",
                "color": "ffab4a",
                "image_url": "",
            },
        )
        item1.assigned_to.add(user)

        item2, item2_created = Item.objects.get_or_create(
            list=doing,
            title="Add a few cards",
            defaults={
                "description": "Try dragging cards between lists.",
                "color": "00c2e0",
                "image_url": "",
                "due_date": timezone.now() + timezone.timedelta(days=2),
            },
        )

        item3, item3_created = Item.objects.get_or_create(
            list=done,
            title="Invite teammates",
            defaults={
                "description": "Create a project and invite members.",
                "color": "c377e0",
                "image_url": "",
            },
        )

        items_created = result.items_created + int(item1_created) + int(item2_created) + int(item3_created)

        comment, comment_created = Comment.objects.get_or_create(
            item=item2,
            author=user,
            body="This is a sample comment. You can add more from the card modal.",
        )
        comments_created = result.comments_created + int(comment_created)

        return SeedResult(
            projects_created=result.projects_created,
            boards_created=result.boards_created,
            lists_created=lists_created,
            items_created=items_created,
            comments_created=comments_created,
        )
