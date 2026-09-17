from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.session import Session
from app.models.analysis import Analysis
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


async def get_session_transcripts(
    db: AsyncSession,
    session_id: str,
    user_id: str
) -> Optional[List]:
    """Retrieve all transcripts for an owned session, ordered chronologically."""
    session = await get_session_by_id(db, session_id, user_id)
    if not session:
        return None

    from app.models.transcript import Transcript
    query = (
        select(Transcript)
        .where(Transcript.session_id == session_id)
        .order_by(Transcript.timestamp.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_session_analysis(
    db: AsyncSession,
    session_id: str,
    user_id: str
) -> Optional[Analysis]:
    """Retrieve saved AI analysis for an owned session."""
    session = await get_session_by_id(db, session_id, user_id)
    if not session:
        return None

    query = select(Analysis).where(Analysis.session_id == session_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def save_or_update_analysis(
    db: AsyncSession,
    session_id: str,
    summary: str,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None,
    suggestions: Optional[List[str]] = None,
) -> Analysis:
    """
    Save or update an AI analysis for a session.
    If an analysis already exists for this session, it is updated;
    otherwise, a new Analysis record is created.
    """
    query = select(Analysis).where(Analysis.session_id == session_id)
    result = await db.execute(query)
    analysis = result.scalar_one_or_none()

    clean_strengths = strengths or []
    clean_weaknesses = weaknesses or []
    clean_suggestions = suggestions or []

    if analysis:
        analysis.summary = summary
        analysis.strengths = clean_strengths
        analysis.weaknesses = clean_weaknesses
        analysis.suggestions = clean_suggestions
        analysis.created_at = datetime.utcnow()
    else:
        analysis = Analysis(
            session_id=session_id,
            summary=summary,
            strengths=clean_strengths,
            weaknesses=clean_weaknesses,
            suggestions=clean_suggestions,
        )
        db.add(analysis)

    await db.commit()
    await db.refresh(analysis)
    return analysis


async def delete_session_analysis(
    db: AsyncSession,
    session_id: str,
    user_id: str
) -> bool:
    """Delete an AI analysis for an owned session."""
    session = await get_session_by_id(db, session_id, user_id)
    if not session:
        return False

    query = select(Analysis).where(Analysis.session_id == session_id)
    result = await db.execute(query)
    analysis = result.scalar_one_or_none()
    if not analysis:
        return False

    await db.delete(analysis)
    await db.commit()
    return True

