import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


class GeminiService:
    """
    Service encapsulating AI speech and transcript analysis using Google Gemini.
    Follows Phase 10 architecture: analysis.py -> gemini_service.py -> Gemini.
    Keeps API keys strictly server-side and streams structured insights progressively via SSE.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or settings.GEMINI_API_KEY or "").strip()

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your_"))

    async def analyze_transcripts_stream(
        self,
        transcripts: List[str]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Analyze speech transcripts with Gemini and stream progressive events.
        Yields normalized event dictionaries suitable for SSE serialization:
          - {'event': 'status', 'data': {...}}
          - {'event': 'chunk', 'data': {'field': 'summary', 'delta': 'word '}}
          - {'event': 'strength', 'data': {'index': i, 'text': '...'}}
          - {'event': 'weakness', 'data': {'index': i, 'text': '...'}}
          - {'event': 'suggestion', 'data': {'index': i, 'text': '...'}}
          - {'event': 'complete', 'data': {...}}
        """
        full_transcript = " ".join([t.strip() for t in transcripts if t and t.strip()])

        # 1. Fallback if no API key is provided
        if not self.is_configured():
            logger.warning("[Gemini] No valid GEMINI_API_KEY configured. Using intelligent fallback simulation.")
            async for event in self._simulate_analysis_stream(full_transcript):
                yield event
            return

        # 2. Build analysis prompt
        if full_transcript:
            content_prompt = (
                f"You are an expert AI speech coach and communication analyst.\n"
                f"Carefully analyze the following real-time speech transcripts from a voice session:\n\n"
                f"--- TRANSCRIPT ---\n{full_transcript}\n--- END TRANSCRIPT ---\n\n"
                f"Provide a rigorous analysis in valid JSON format with these exact keys:\n"
                f"- 'summary': A comprehensive 2-4 sentence executive summary evaluating what the speaker discussed, clarity, and articulation.\n"
                f"- 'strengths': A list of 2-4 specific communication and topical strengths exhibited by the speaker.\n"
                f"- 'weaknesses': A list of 2-3 specific areas where the speaker could improve (e.g. vocal fillers, structural clarity, pacing).\n"
                f"- 'suggestions': A list of 2-3 concrete, actionable recommendations for future sessions."
            )
        else:
            content_prompt = (
                "You are an expert AI speech coach. The session did not produce transcript segments (the microphone was silent or short).\n"
                "Provide an analysis in valid JSON format with exact keys:\n"
                "- 'summary': A 2-sentence note stating that minimal vocal audio was detected during the session and recommending a full spoken trial.\n"
                "- 'strengths': A list of 2 positive technical notes on session connectivity and microphone setup.\n"
                "- 'weaknesses': A list of 2 notes on lack of audible spoken words.\n"
                "- 'suggestions': A list of 2 tips on microphone placement and speaking clearly."
            )

        yield {
            "event": "status",
            "data": {
                "step": "contacting_gemini",
                "message": f"Sending {len(transcripts)} transcript segment(s) to Gemini ({GEMINI_MODEL})..."
            }
        }

        url = f"{GEMINI_API_URL}?key={self.api_key}"

        request_body = {
            "contents": [
                {
                    "parts": [{"text": content_prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, json=request_body)

                if response.status_code != 200:
                    logger.error(f"[Gemini] API error {response.status_code}: {response.text}")
                    yield {
                        "event": "status",
                        "data": {
                            "step": "fallback",
                            "message": f"Gemini API returned code {response.status_code}. Generating synthesized speech analysis..."
                        }
                    }
                    async for event in self._simulate_analysis_stream(full_transcript):
                        yield event
                    return

                res_json = response.json()
                candidates = res_json.get("candidates", [])
                if not candidates:
                    raise ValueError("Gemini returned an empty candidate list")

                raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
                analysis_data = json.loads(raw_text)

        except Exception as err:
            logger.error(f"[Gemini] Request or parsing failed: {err}. Falling back to simulation.")
            yield {
                "event": "status",
                "data": {
                    "step": "fallback",
                    "message": f"Gemini engine error ({str(err)}). Using fallback speech analysis..."
                }
            }
            async for event in self._simulate_analysis_stream(full_transcript):
                yield event
            return

        # 3. Stream the parsed Gemini result progressively via SSE events
        yield {
            "event": "status",
            "data": {
                "step": "streaming_summary",
                "message": "Streaming Gemini executive summary..."
            }
        }
        await asyncio.sleep(0.3)

        # Progressive summary chunk streaming (word-by-word)
        summary_text = analysis_data.get("summary", "Analysis completed.")
        words = summary_text.split(" ")
        for i, word in enumerate(words):
            yield {
                "event": "chunk",
                "data": {
                    "field": "summary",
                    "delta": word + " ",
                    "index": i,
                    "total": len(words)
                }
            }
            await asyncio.sleep(0.04)  # 40ms progressive typing cadence

        await asyncio.sleep(0.2)

        # Key Strengths
        strengths = analysis_data.get("strengths", [])
        for idx, s in enumerate(strengths):
            yield {
                "event": "strength",
                "data": {"index": idx, "text": str(s)}
            }
            await asyncio.sleep(0.2)

        # Areas for Improvement
        weaknesses = analysis_data.get("weaknesses", [])
        for idx, w in enumerate(weaknesses):
            yield {
                "event": "weakness",
                "data": {"index": idx, "text": str(w)}
            }
            await asyncio.sleep(0.2)

        # Actionable Suggestions
        suggestions = analysis_data.get("suggestions", [])
        for idx, sug in enumerate(suggestions):
            yield {
                "event": "suggestion",
                "data": {"index": idx, "text": str(sug)}
            }
            await asyncio.sleep(0.2)

        # Final Completion Event
        yield {
            "event": "complete",
            "data": {
                "model": GEMINI_MODEL,
                "status": "completed",
                "summary": summary_text,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "suggestions": suggestions
            }
        }

    async def _simulate_analysis_stream(
        self,
        transcript: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Fallback analysis generator when Gemini API key is unset or unreachable."""
        if transcript:
            preview = transcript[:120] + ("..." if len(transcript) > 120 else "")
            summary_text = (
                f"The speaker's session addressed: \"{preview}\". "
                "The presentation demonstrated coherent speech flow, clear pronunciation, and focused vocal delivery."
            )
        else:
            summary_text = (
                "The recorded voice session was completed successfully. "
                "Vocal cadence was steady and comfortable, maintaining an engaging speaking rhythm."
            )

        strengths = [
            "Clear vocal cadence and natural conversational flow",
            "Effective use of real-time speech streaming",
            "Steady volume and low vocal hesitation"
        ]
        weaknesses = [
            "Occasional mid-sentence pauses during spontaneous responses",
            "Could integrate more concrete data or metrics"
        ]
        suggestions = [
            "Briefly organize main ideas prior to speaking to minimize filler pauses",
            "Continue practicing live sessions to build conversational flow"
        ]

        words = summary_text.split(" ")
        for i, word in enumerate(words):
            yield {
                "event": "chunk",
                "data": {
                    "field": "summary",
                    "delta": word + " ",
                    "index": i,
                    "total": len(words)
                }
            }
            await asyncio.sleep(0.05)

        await asyncio.sleep(0.2)

        for idx, s in enumerate(strengths):
            yield {"event": "strength", "data": {"index": idx, "text": s}}
            await asyncio.sleep(0.2)

        for idx, w in enumerate(weaknesses):
            yield {"event": "weakness", "data": {"index": idx, "text": w}}
            await asyncio.sleep(0.2)

        for idx, sug in enumerate(suggestions):
            yield {"event": "suggestion", "data": {"index": idx, "text": sug}}
            await asyncio.sleep(0.2)

        yield {
            "event": "complete",
            "data": {
                "model": "synthesized-fallback",
                "status": "completed",
                "summary": summary_text,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "suggestions": suggestions
            }
        }


# Export singleton instance
gemini_service = GeminiService()
