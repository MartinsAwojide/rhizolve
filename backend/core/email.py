import asyncio

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Content, Email, Mail, To

from core.config import SENDGRID_API_KEY, SENDGRID_FROM_EMAIL


async def send_invitation_email(to_email: str, project_name: str, role: str) -> None:
    def _send() -> None:
        sg = SendGridAPIClient(api_key=SENDGRID_API_KEY)
        mail = Mail(
            Email(SENDGRID_FROM_EMAIL),
            To(to_email),
            f"You've been invited to {project_name}",
            Content(
                "text/html",
                f"You've been invited to <strong>{project_name}</strong> as {role}.",
            ),
        ).get()
        sg.client.mail.send.post(request_body=mail)

    await asyncio.to_thread(_send)
