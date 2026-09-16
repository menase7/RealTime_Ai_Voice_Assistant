from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.session import Session
from app.schemas.session import SessionCreate, SessionUpdate


async def create_session(
    db: AsyncSession,
    user_id: str,
    session_in: Optional[SessionCreate] = None
) -> Session:
    """Create a new voice session record for an authenticated user."""
    title = session_in.title if session_in and session_in.title and session_in.title.strip() else None
    if not title:
        now_str = datetime.utcnow().strftime("%b %d, %H:%M")
        title = f"Voice Session ({now_str})"

    new_session = Session(
        user_id=user_id,
        title=title.strip(),
        status="created",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session


async def get_user_sessions(db: AsyncSession, user_id: str) -> List[Session]:
    """Retrieve all voice sessions for a given user, newest first."""
    query = (
        select(Session)
        .where(Session.user_id == user_id)
        .order_by(desc(Session.created_at))
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_session_by_id(
    db: AsyncSession,
    session_id: str,
    user_id: str
) -> Optional[Session]:
    """Retrieve a single session by ID, ensuring it belongs to the authenticated user."""
    query = select(Session).where(
        Session.id == session_id,
        Session.user_id == user_id
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def update_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    session_in: SessionUpdate
) -> Optional[Session]:
    """Update title, status, or timestamps of a user's session."""
    session = await get_session_by_id(db, session_id, user_id)
    if not session:
        return None

    if session_in.title is not None and session_in.title.strip():
        session.title = session_in.title.strip()
    if session_in.status is not None:
        session.status = session_in.status
        if session_in.status == "active" and not session.started_at:
            session.started_at = datetime.utcnow()
        elif session_in.status == "completed" and not session.ended_at:
            session.ended_at = datetime.utcnow()
    if session_in.started_at is not None:
        session.started_at = session_in.started_at
    if session_in.ended_at is not None:
        session.ended_at = session_in.ended_at

    await db.commit()
    await db.refresh(session)
    return session


async def delete_session(
    db: AsyncSession,
    session_id: str,
    user_id: str
) -> bool:
    """Delete a voice session belonging to the authenticated user."""
    session = await get_session_by_id(db, session_id, user_id)
    if not session:
        return False

    await db.delete(session)
    await db.commit()
    return True
