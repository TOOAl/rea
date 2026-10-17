"""Local audio design — the free substitute for Veo 3's native audio track.

Veo/Sora generate dialogue, SFX and ambience together with the picture.  When no
paid provider is reachable this module builds the equivalent locally:

* narration from a pluggable TTS backend (offline eSpeak-NG, free edge-tts,
  OpenAI/ElevenLabs/Google/Azure adapters, or your own recording),
* procedural music beds with real chord progressions and ducking under narration,
* procedural SFX (whoosh, impact, riser, UI clicks, cash register, typing),
* procedural ambience (room tone, cafe, rain, city, office),
* a mix + master pass normalized to YouTube's -14 LUFS / -1.5 dBTP target.

All synthesis is numpy -> 16-bit WAV, so it runs offline and is reproducible from
a seed.
"""

from __future__ import annotations

import ctypes
import json
import math
import os
import shutil
import subprocess
import urllib.error
import urllib.request
import wave
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Sequence

SAMPLE_RATE = 44100

VOICE_BY_LANGUAGE: dict[str, dict[str, Any]] = {
    "ko-KR": {"espeak": "ko", "edge": "ko-KR-SeoHyeonNeural", "google": "ko-KR-Standard-B", "openai": "nova", "eleven": "ko-KR-default"},
    "en-US": {"espeak": "en-us", "edge": "en-US-AriaNeural", "google": "en-US-Standard-F", "openai": "nova", "eleven": "en-US-default"},
    "ja-JP": {"espeak": "ja", "edge": "ja-JP-NanamiNeural", "google": "ja-JP-Standard-B", "openai": "nova", "eleven": "ja-JP-default"},
}


@dataclass(slots=True)
class TtsResult:
    path: str
    backend: str
    duration_s: float
    sample_rate: int
    segments: list[dict[str, Any]] = field(default_factory=list)  # [{"text","start_s","end_s","words":[...]}]
    voice: str = ""
    warnings: list[str] = field(default_factory=list)


def _write_wav(path: Path, data: Any, sample_rate: int = SAMPLE_RATE) -> Path:
    import numpy as np

    path.parent.mkdir(parents=True, exist_ok=True)
    array = np.asarray(data, dtype="float32")
    if array.ndim == 1:
        array = np.stack([array, array], axis=1)
    clipped = np.clip(array, -1.0, 1.0)
    pcm = (clipped * 32767).astype("<i2")
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(pcm.shape[1])
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm.tobytes())
    return path


def _read_wav(path: Path | str) -> tuple[Any, int]:
    import numpy as np

    with wave.open(str(path), "rb") as handle:
        frames = handle.readframes(handle.getnframes())
        rate = handle.getframerate()
        channels = handle.getnchannels()
    if not frames:
        return np.zeros((1, 2), dtype="float32"), rate
    data = np.frombuffer(frames, dtype="<i2").astype("float32") / 32767.0
    if channels > 1:
        data = data.reshape(-1, channels)
    else:
        data = np.stack([data, data], axis=1)
    return data, rate


def _resample(data: Any, from_rate: int, to_rate: int = SAMPLE_RATE) -> Any:
    import numpy as np

    if from_rate == to_rate or data.size == 0:
        return data
    ratio = to_rate / from_rate
    length = max(int(len(data) * ratio), 1)
    positions = np.linspace(0, len(data) - 1, length)
    if data.ndim == 1:
        return np.interp(positions, np.arange(len(data)), data).astype("float32")
    out = np.zeros((length, data.shape[1]), dtype="float32")
    for channel in range(data.shape[1]):
        out[:, channel] = np.interp(positions, np.arange(len(data)), data[:, channel])
    return out


class TtsBackend:
    """Backends synthesize one segment at a time; the base class owns timing layout.

    Per-segment WAV files are preserved (``segments/seg_NNN.wav``) so the mixer can
    place narration exactly at each scene start instead of assuming contiguous speech.
    """

    name = "base"
    requires_network = False

    def available(self) -> tuple[bool, str]:  # pragma: no cover - interface
        raise NotImplementedError

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:  # pragma: no cover - interface
        raise NotImplementedError

    def synthesize_segments(
        self, segments: Sequence[str], *, language: str, voice: str = "", rate: int = 0, out_dir: Path
    ) -> TtsResult:
        import numpy as np

        out_dir.mkdir(parents=True, exist_ok=True)
        segment_dir = out_dir / "segments"
        segment_dir.mkdir(parents=True, exist_ok=True)
        meta: list[dict[str, Any]] = []
        parts: list[Any] = []
        cursor = 0.0
        warnings: list[str] = []
        for index, text in enumerate(segments):
            clean = str(text).strip()
            if not clean:
                continue
            try:
                path, duration, words = self._synthesize_one(
                    clean, index, segment_dir, language=language, voice=voice, rate=rate
                )
            except Exception as error:
                warnings.append(f"{self.name}: segment {index} failed ({error})")
                duration = reading_duration_s(clean, language)
                path = _write_wav(segment_dir / f"seg_{index:03d}.wav", np.zeros((int(duration * SAMPLE_RATE), 2)))
                words = estimate_word_timing(clean, 0.0, duration)
            shifted = [
                {"word": str(word.get("word", "")), "start_s": round(cursor + float(word.get("start_s", 0.0)), 3), "end_s": round(cursor + float(word.get("end_s", 0.0)), 3)}
                for word in words
            ]
            meta.append(
                {
                    "text": clean,
                    "start_s": round(cursor, 3),
                    "end_s": round(cursor + duration, 3),
                    "duration_s": round(duration, 3),
                    "path": str(path),
                    "words": shifted,
                }
            )
            data, rate_hz = _read_wav(path)
            parts.append((cursor, _resample(data, rate_hz)))
            cursor += duration
        combined = _stitch(parts, cursor)
        combined_path = _write_wav(out_dir / "narration.wav", combined)
        resolved_voice = voice or VOICE_BY_LANGUAGE.get(language, {}).get(self.name.split("-")[0], "")
        return TtsResult(
            path=str(combined_path),
            backend=self.name,
            duration_s=round(cursor, 3),
            sample_rate=SAMPLE_RATE,
            segments=meta,
            voice=resolved_voice,
            warnings=[*warnings, *self.extra_warnings()],
        )

    def extra_warnings(self) -> list[str]:
        return []


def _stitch(parts: Sequence[tuple[float, Any]], total_s: float) -> Any:
    import numpy as np

    length = max(int(total_s * SAMPLE_RATE), 1)
    out = np.zeros((length, 2), dtype="float32")
    for start_s, data in parts:
        if data.size == 0:
            continue
        offset = int(start_s * SAMPLE_RATE)
        end = min(offset + len(data), length)
        if end <= offset:
            continue
        chunk = data[: end - offset]
        if chunk.ndim == 1:
            chunk = np.stack([chunk, chunk], axis=1)
        out[offset:end] += chunk[: end - offset]
    peak = float(np.max(np.abs(out)) or 1.0)
    return (out / peak * 0.95).astype("float32") if peak > 1.0 else out


class EspeakNgBackend(TtsBackend):
    """Offline eSpeak-NG via ctypes (Korean supported).  Robotic, but free and local."""

    name = "espeak-ng"
    requires_network = False

    def __init__(self) -> None:
        self._lib: Any = None
        self._sample_rate = 22050
        self._error = ""
        self._keepalive: list[Any] = []

    def _load(self) -> Any:
        if self._lib is not None:
            return self._lib
        try:
            import espeakng_loader  # type: ignore

            library = ctypes.CDLL(espeakng_loader.get_library_path())
            parent = str(Path(espeakng_loader.get_data_path()).parent)
            rate = library.espeak_Initialize(1, 60, parent.encode(), 0)
            if not rate or rate <= 0:
                self._error = "espeak_Initialize failed"
                return None
            library.espeak_Synth.argtypes = [
                ctypes.c_char_p,
                ctypes.c_size_t,
                ctypes.c_uint,
                ctypes.c_int,
                ctypes.c_uint,
                ctypes.c_uint,
                ctypes.POINTER(ctypes.c_uint),
                ctypes.c_void_p,
            ]
            self._sample_rate = int(rate)
            self._lib = library
            return library
        except Exception as error:  # pragma: no cover - depends on optional wheel
            self._error = f"espeakng-loader unavailable: {error}"
            return None

    def available(self) -> tuple[bool, str]:
        return (bool(self._load()), self._error)

    def extra_warnings(self) -> list[str]:
        return ["formant TTS: robotic timbre — record your own voice for the strongest authenticity signal"]

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:
        import numpy as np

        library = self._load()
        if library is None:
            raise RuntimeError(self._error or "espeak-ng unavailable")
        callback_type = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)
        buffer: list[bytes] = []

        @callback_type
        def callback(samples, count, _events):  # type: ignore[no-untyped-def]
            if count > 0:
                buffer.append(ctypes.string_at(samples, count * 2))
            return 0

        self._keepalive.append(callback)
        resolved_voice = voice or VOICE_BY_LANGUAGE.get(language, {}).get("espeak", "en-us")
        library.espeak_SetSynthCallback(callback)
        library.espeak_SetVoiceByName(resolved_voice.encode())
        library.espeak_SetParameter(1, int(150 + rate), 0)  # espeakRATE
        payload = text.encode("utf-8") + b"\x00"
        status = library.espeak_Synth(payload, len(payload), 0, 0, 0, 0, None, None)
        library.espeak_Synchronize()
        if status != 0:
            raise RuntimeError(f"espeak_Synth status {status}")
        audio = np.frombuffer(b"".join(buffer), dtype="<i2").astype("float32") / 32767.0
        if audio.size == 0:
            raise RuntimeError("espeak produced no samples")
        duration = len(audio) / self._sample_rate
        path = _write_wav(out_dir / f"seg_{index:03d}.wav", audio, self._sample_rate)
        return path, duration, estimate_word_timing(text, 0.0, duration)


class EdgeTtsBackend(TtsBackend):
    """Free Microsoft Edge neural TTS — the best Korean voice without a paid key."""

    name = "edge-tts"
    requires_network = True

    def available(self) -> tuple[bool, str]:
        try:
            import edge_tts  # type: ignore # noqa: F401

            return True, ""
        except Exception:
            return False, "pip install edge-tts (needs network at synthesis time)"

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:
        import asyncio

        import edge_tts  # type: ignore

        from .render import transcode

        resolved_voice = voice or VOICE_BY_LANGUAGE.get(language, {}).get("edge", "ko-KR-SeoHyeonNeural")
        mp3_path = out_dir / f"seg_{index:03d}.mp3"
        wav_path = out_dir / f"seg_{index:03d}.wav"
        boundaries: list[dict[str, Any]] = []

        async def run() -> None:
            communicate = edge_tts.Communicate(text, resolved_voice, rate=f"{rate:+d}Hz" if rate else "+0Hz")
            audio_bytes = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes += chunk["data"]
                elif chunk["type"] == "WordBoundary":
                    boundaries.append(
                        {
                            "word": chunk["text"],
                            "start_s": round(chunk["offset"] / 1e7, 3),
                            "end_s": round((chunk["offset"] + chunk["duration"]) / 1e7, 3),
                        }
                    )
            mp3_path.write_bytes(audio_bytes)

        asyncio.run(run())
        transcode(mp3_path, wav_path, sample_rate=SAMPLE_RATE)
        mp3_path.unlink(missing_ok=True)
        data, rate_hz = _read_wav(wav_path)
        duration = len(data) / rate_hz
        return wav_path, duration, boundaries or estimate_word_timing(text, 0.0, duration)


class HumanRecordingBackend(TtsBackend):
    """Use your own voice — the strongest authenticity evidence available."""

    name = "human-recording"
    requires_network = False

    def __init__(self, files: Sequence[Path | str] | None = None) -> None:
        self.files = [Path(item) for item in (files or [])]

    def available(self) -> tuple[bool, str]:
        present = [item for item in self.files if item.exists()]
        return (bool(present), "" if present else "no recording files supplied (--voice-file)")

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:
        import shutil

        if not self.files:
            raise RuntimeError("no human recordings supplied")
        source = self.files[index % len(self.files)]
        destination = out_dir / f"seg_{index:03d}.wav"
        data, rate_hz = _read_wav(source)
        duration = len(data) / rate_hz
        shutil.copyfile(source, destination)
        return destination, duration, estimate_word_timing(text, 0.0, duration)


class OpenAiTtsBackend(TtsBackend):
    name = "openai-tts"
    requires_network = True

    def __init__(self, api_key: str | None = None, *, model: str = "gpt-4o-mini-tts") -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = os.environ.get("OPENAI_TTS_MODEL", model)
        self.base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

    def available(self) -> tuple[bool, str]:
        return (bool(self.api_key), "" if self.api_key else "OPENAI_API_KEY not set")

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:
        resolved_voice = voice or VOICE_BY_LANGUAGE.get(language, {}).get("openai", "nova")
        payload = {"model": self.model, "voice": resolved_voice, "input": text, "response_format": "wav"}
        request = urllib.request.Request(f"{self.base_url}/audio/speech", data=json.dumps(payload).encode(), method="POST")
        request.add_header("Authorization", f"Bearer {self.api_key}")
        request.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(request, timeout=120) as response:  # noqa: S310
                body = response.read()
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"openai tts {error.code}") from error
        path = out_dir / f"seg_{index:03d}.wav"
        path.write_bytes(body)
        data, rate_hz = _read_wav(path)
        duration = len(data) / rate_hz
        return path, duration, estimate_word_timing(text, 0.0, duration)


class ElevenLabsBackend(TtsBackend):
    name = "elevenlabs"
    requires_network = True

    def __init__(self, api_key: str | None = None, *, voice_id: str = "21m00Tcm4TlvDq8ikWAM", model: str = "eleven_multilingual_v2") -> None:
        self.api_key = api_key or os.environ.get("ELEVENLABS_API_KEY", "")
        self.voice_id = os.environ.get("ELEVENLABS_VOICE_ID", voice_id)
        self.model = model

    def available(self) -> tuple[bool, str]:
        return (bool(self.api_key), "" if self.api_key else "ELEVENLABS_API_KEY not set")

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:
        payload = {
            "text": text,
            "model_id": self.model,
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "speed": 1.0 + rate / 400.0},
        }
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice or self.voice_id}?output_format=wav_44100_16"
        request = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST")
        request.add_header("xi-api-key", self.api_key)
        request.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(request, timeout=180) as response:  # noqa: S310
                body = response.read()
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"elevenlabs {error.code}") from error
        path = out_dir / f"seg_{index:03d}.wav"
        path.write_bytes(body)
        data, rate_hz = _read_wav(path)
        duration = len(data) / rate_hz
        return path, duration, estimate_word_timing(text, 0.0, duration)


class GoogleTtsBackend(TtsBackend):
    name = "google-tts"
    requires_network = True

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.environ.get("GOOGLE_TTS_API_KEY", "")

    def available(self) -> tuple[bool, str]:
        return (bool(self.api_key), "" if self.api_key else "GOOGLE_TTS_API_KEY not set")

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:
        import base64

        resolved_voice = voice or VOICE_BY_LANGUAGE.get(language, {}).get("google", "ko-KR-Standard-B")
        payload = {
            "input": {"text": text},
            "voice": {"languageCode": language, "name": resolved_voice},
            "audioConfig": {"audioEncoding": "LINEAR16", "speakingRate": 1.0 + rate / 400.0, "sampleRateHertz": SAMPLE_RATE},
        }
        request = urllib.request.Request(
            f"https://texttospeech.googleapis.com/v1/text:synthesize?key={self.api_key}",
            data=json.dumps(payload).encode(),
            method="POST",
        )
        request.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(request, timeout=120) as response:  # noqa: S310
                data = json.loads(response.read().decode())
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"google tts {error.code}") from error
        path = out_dir / f"seg_{index:03d}.wav"
        path.write_bytes(base64.b64decode(data["audioContent"]))
        audio, rate_hz = _read_wav(path)
        duration = len(audio) / rate_hz
        return path, duration, estimate_word_timing(text, 0.0, duration)


class SilentBackend(TtsBackend):
    """Last resort: no narration.  Captions carry the content; policy guard is notified."""

    name = "silent"
    requires_network = False

    def available(self) -> tuple[bool, str]:
        return True, ""

    def extra_warnings(self) -> list[str]:
        return ["no narration audio: video relies on burned captions only (policy risk: low narrative value)"]

    def _synthesize_one(
        self, text: str, index: int, out_dir: Path, *, language: str, voice: str, rate: int
    ) -> tuple[Path, float, list[dict[str, Any]]]:
        import numpy as np

        duration = reading_duration_s(text, language)
        silence = np.zeros((int(duration * SAMPLE_RATE), 2), dtype="float32")
        path = _write_wav(out_dir / f"seg_{index:03d}.wav", silence)
        return path, duration, estimate_word_timing(text, 0.0, duration)


def default_tts_chain(language: str = "ko-KR", voice_files: Sequence[Path | str] = ()) -> list[TtsBackend]:
    """Order: your voice -> free neural -> paid -> offline formant -> silence."""

    chain: list[TtsBackend] = []
    if voice_files:
        chain.append(HumanRecordingBackend(voice_files))
    chain.extend([EdgeTtsBackend(), ElevenLabsBackend(), OpenAiTtsBackend(), GoogleTtsBackend(), EspeakNgBackend(), SilentBackend()])
    _ = language
    return chain


def select_tts(language: str = "ko-KR", voice_files: Sequence[Path | str] = (), prefer: str = "") -> tuple[TtsBackend, list[str]]:
    notes: list[str] = []
    chain = default_tts_chain(language, voice_files)
    if prefer:
        chain.sort(key=lambda backend: 0 if backend.name == prefer else 1)
    for backend in chain:
        ok, reason = backend.available()
        if ok:
            if reason:
                notes.append(f"{backend.name}: {reason}")
            return backend, notes
        notes.append(f"{backend.name}: unavailable ({reason})")
    return SilentBackend(), notes


def estimate_word_timing(text: str, start_s: float, duration_s: float) -> list[dict[str, Any]]:
    """Proportional word timings when the backend does not report boundaries."""

    words = [word for word in text.split() if word.strip()]
    if not words:
        return []
    weights = [max(1.0, _syllable_weight(word)) for word in words]
    total = sum(weights)
    timings: list[dict[str, Any]] = []
    cursor = start_s
    for word, weight in zip(words, weights):
        span = duration_s * weight / total
        timings.append({"word": word, "start_s": round(cursor, 3), "end_s": round(cursor + span, 3)})
        cursor += span
    return timings


def _syllable_weight(word: str) -> float:
    hangul = sum(1 for ch in word if "\uac00" <= ch <= "\ud7a3")
    latin = sum(1 for ch in word if ch.isascii() and ch.isalpha())
    return hangul * 1.0 + latin * 0.32


# --------------------------------------------------------------------------- #
# procedural music / sfx / ambience
# --------------------------------------------------------------------------- #
MOOD_PRESETS: dict[str, dict[str, Any]] = {
    "calm": {"tempo": 74, "key": "A", "progression": ["Imaj7", "IVmaj7", "vim7", "V7"], "instruments": ("pad", "bass"), "percussion": 0.0, "energy": 0.3},
    "analytical": {"tempo": 96, "key": "C", "progression": ["Imaj7", "V7", "vim7", "IVmaj7"], "instruments": ("pad", "bass", "arp"), "percussion": 0.35, "energy": 0.5},
    "upbeat": {"tempo": 118, "key": "G", "progression": ["Imaj7", "IVmaj7", "V7", "vim7"], "instruments": ("pad", "bass", "arp"), "percussion": 0.75, "energy": 0.8},
    "urgent": {"tempo": 128, "key": "D", "progression": ["imin7", "VIImaj7", "imin7", "ivmin7"], "instruments": ("pad", "bass", "arp"), "percussion": 0.9, "energy": 0.95},
    "hopeful": {"tempo": 88, "key": "F", "progression": ["Imaj7", "IVmaj7", "Iadd9", "V7"], "instruments": ("pad", "bass", "arp"), "percussion": 0.4, "energy": 0.55},
    "warm": {"tempo": 80, "key": "E", "progression": ["Imaj7", "iiim7", "IVmaj7", "V7"], "instruments": ("pad", "bass"), "percussion": 0.25, "energy": 0.4},
    "serious": {"tempo": 68, "key": "A", "progression": ["imin7", "ivmin7", "VIImaj7", "imin7"], "instruments": ("pad", "bass"), "percussion": 0.15, "energy": 0.28},
}

NOTE_OFFSETS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
DEGREE_OFFSETS = {"I": 0, "II": 2, "III": 4, "IV": 5, "V": 7, "VI": 9, "VII": 11}
MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]


def _midi_to_freq(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def _chord(symbol: str, key: str, minor_key: bool) -> list[int]:
    """Roman-numeral symbol -> MIDI tones (root position, optional 7th/add9)."""

    numeral = ""
    for char in symbol:
        if char in "IViv":
            numeral += char
        else:
            break
    quality = symbol[len(numeral) :]
    scale = MINOR_SCALE if minor_key else MAJOR_SCALE
    degree = DEGREE_OFFSETS.get(numeral.upper(), 0)
    root_index = scale.index(degree) if degree in scale else 0
    root = 60 + NOTE_OFFSETS.get(key.upper(), 0) + scale[root_index]
    minor_chord = numeral.islower() or quality.startswith("min")
    tones = [root, root + (3 if minor_chord else 4), root + 7]
    if quality.endswith("7"):
        tones.append(root + (11 if "maj" in quality else 10))
    if "add9" in quality:
        tones.append(root + 14)
    return tones


def reading_duration_s(text: str, language: str = "ko-KR") -> float:
    """Speaking-time model used when a backend reports no timings."""

    hangul = sum(1 for ch in text if "\uac00" <= ch <= "\ud7a3")
    words = len([w for w in text.split() if w.strip()])
    if language.startswith("ko") or hangul:
        return max(1.0, hangul / 5.6 + words * 0.12)
    return max(1.0, words / 2.6)


def _midi_to_freq(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def _chord(symbol: str, key: str, minor_key: bool) -> list[int]:
    numeral = ""
    for char in symbol:
        if char in "IViv":
            numeral += char
        else:
            break
    quality = symbol[len(numeral) :]
    scale = MINOR_SCALE if minor_key else MAJOR_SCALE
    degree = DEGREE_OFFSETS[numeral.upper()]
    root_index = scale.index(degree) if degree in scale else 0
    root = 60 + NOTE_OFFSETS.get(key.upper(), 0) + scale[root_index]
    third = 3 if (numeral.islower() or "min" in quality or "m7" in quality and "maj" not in quality) else 4
    if quality.startswith("min") or numeral.islower():
        third = 3
    fifth = 7
    tones = [root, root + third, root + fifth]
    if "7" in quality:
        tones.append(root + (11 if "maj" in quality else 10))
    if "add9" in quality:
        tones.append(root + 14)
    return tones


def _lowpass(data: Any, cutoff_hz: float, sample_rate: int = SAMPLE_RATE) -> Any:
    """FFT brick-wall lowpass: vectorized, so beds render in well under a second."""

    import numpy as np

    array = np.asarray(data, dtype="float32")
    if array.size == 0:
        return array
    spectrum = np.fft.rfft(array, axis=0)
    freqs = np.fft.rfftfreq(len(array), 1.0 / sample_rate)
    rolloff = 1.0 / (1.0 + (freqs / max(cutoff_hz, 20.0)) ** 4)
    return np.fft.irfft(spectrum * rolloff[:, None], n=len(array), axis=0).astype("float32")


def _adsr(length: int, attack: float, decay: float, sustain: float, release: float, sample_rate: int = SAMPLE_RATE) -> Any:
    import numpy as np

    envelope = np.ones(length, dtype="float32")
    a = max(int(attack * sample_rate), 1)
    r = max(int(release * sample_rate), 1)
    d = max(int(decay * sample_rate), 1)
    envelope[: min(a, length)] = np.linspace(0, 1, min(a, length))
    end_decay = min(a + d, length)
    if end_decay > a:
        envelope[a:end_decay] = np.linspace(1, sustain, end_decay - a)
    if end_decay < length:
        envelope[end_decay : length - r] = sustain
    if length - r > end_decay:
        envelope[length - r :] = np.linspace(sustain, 0, r)
    return envelope.astype("float32")


def generate_music(duration_s: float, mood: str = "calm", *, seed: int = 0, out_path: Path | None = None, duck_windows: Sequence[tuple[float, float]] = (), duck_db: float = -9.0) -> Path:
    """Procedural bed: chord pad + bass + arpeggio + light percussion, ducked under narration."""

    import numpy as np

    preset = MOOD_PRESETS.get(mood, MOOD_PRESETS["calm"])
    tempo = int(preset["tempo"])
    key = str(preset["key"])
    minor_key = str(preset["progression"][0]).startswith("i")
    beat = 60.0 / tempo
    bar = beat * 4
    bars = max(int(math.ceil(duration_s / bar)) + 1, 2)
    rng = np.random.default_rng(seed)
    total = int(bars * bar * SAMPLE_RATE)
    stereo = np.zeros((total, 2), dtype="float32")
    time_axis = np.arange(total) / SAMPLE_RATE

    for bar_index in range(bars):
        symbol = preset["progression"][bar_index % len(preset["progression"])]
        tones = _chord(symbol, key, minor_key)
        start = int(bar_index * bar * SAMPLE_RATE)
        length = int(bar * SAMPLE_RATE)
        end = min(start + length, total)
        length = end - start
        if length <= 0:
            continue
        t = np.arange(length) / SAMPLE_RATE
        envelope = _adsr(length, 0.35, 0.2, 0.75, 0.45)
        if "pad" in preset["instruments"]:
            pad = np.zeros((length, 2), dtype="float32")
            for tone_index, midi in enumerate(tones):
                freq = _midi_to_freq(midi + 12)
                detune = 1.0 + (0.0016 if tone_index % 2 else -0.0016)
                wave_data = np.sin(2 * np.pi * freq * detune * t) * 0.5 + np.sin(2 * np.pi * freq * 2 * t) * 0.16
                pan = 0.5 + 0.22 * math.sin(bar_index * 0.9 + tone_index)
                pad[:, 0] += wave_data * (1 - pan)
                pad[:, 1] += wave_data * pan
            pad = _lowpass(pad, 1400 + 900 * preset["energy"])
            stereo[start:end] += pad * (envelope[:, None] * 0.20)
        if "bass" in preset["instruments"]:
            bass_freq = _midi_to_freq(tones[0] - 24)
            pattern = [0, 2, 0, 3] if preset["energy"] > 0.5 else [0, 2]
            note_len = int(bar * SAMPLE_RATE / len(pattern))
            for note_index, _ in enumerate(pattern):
                note_start = note_index * note_len
                note_end = min(note_start + note_len, length)
                if note_end <= note_start:
                    continue
                note_t = np.arange(note_end - note_start) / SAMPLE_RATE
                note_env = _adsr(note_end - note_start, 0.01, 0.08, 0.5, 0.12)
                note = np.sin(2 * np.pi * bass_freq * note_t) * note_env * 0.32
                stereo[start + note_start : start + note_end, 0] += note
                stereo[start + note_start : start + note_end, 1] += note
        if "arp" in preset["instruments"]:
            steps = 8
            step_len = int(bar * SAMPLE_RATE / steps)
            for step in range(steps):
                midi = tones[step % len(tones)] + (12 if step % 4 == 3 else 0)
                freq = _midi_to_freq(midi + 12)
                s = step * step_len
                e = min(s + step_len, length)
                if e <= s:
                    continue
                step_t = np.arange(e - s) / SAMPLE_RATE
                env = np.exp(-6.0 * step_t) * 0.16 * preset["energy"]
                pluck = np.sin(2 * np.pi * freq * step_t) * 0.7 + np.sin(2 * np.pi * freq * 3 * step_t) * 0.18
                pan = 0.3 if step % 2 else 0.7
                stereo[start + s : start + e, 0] += pluck * env * (1 - pan)
                stereo[start + s : start + e, 1] += pluck * env * pan
        if preset["percussion"] > 0:
            for pulse in range(4):
                s = int(pulse * beat * SAMPLE_RATE)
                if s >= length:
                    break
                kick_len = min(int(0.18 * SAMPLE_RATE), length - s)
                kt = np.arange(kick_len) / SAMPLE_RATE
                sweep = np.sin(2 * np.pi * (110 - 60 * kt / 0.18) * kt) * np.exp(-22 * kt)
                gain = 0.30 * preset["percussion"] if pulse % 2 == 0 else 0.18 * preset["percussion"]
                stereo[start + s : start + s + kick_len, 0] += sweep * gain
                stereo[start + s : start + s + kick_len, 1] += sweep * gain
                if preset["percussion"] > 0.5:
                    hat_len = min(int(0.05 * SAMPLE_RATE), length - s - int(beat * SAMPLE_RATE / 2))
                    hat_start = s + int(beat * SAMPLE_RATE / 2)
                    if hat_len > 0 and hat_start + hat_len < length:
                        ht = np.arange(hat_len) / SAMPLE_RATE
                        hat = rng.standard_normal(hat_len) * np.exp(-90 * ht) * 0.05 * preset["percussion"]
                        stereo[start + hat_start : start + hat_start + hat_len, 0] += hat
                        stereo[start + hat_start : start + hat_start + hat_len, 1] += hat * 0.8

    # intro lift + outro fade
    fade_in = int(min(1.2, duration_s * 0.08) * SAMPLE_RATE)
    stereo[:fade_in] *= np.linspace(0.25, 1.0, fade_in)[:, None]
    fade_out = int(min(2.0, duration_s * 0.12) * SAMPLE_RATE)
    if fade_out:
        stereo[-fade_out:] *= np.linspace(1.0, 0.0, fade_out)[:, None]

    if duck_windows:
        gain = np.ones(total, dtype="float32")
        duck = 10 ** (duck_db / 20.0)
        for start_s, end_s in duck_windows:
            s = max(int((start_s - 0.12) * SAMPLE_RATE), 0)
            e = min(int((end_s + 0.25) * SAMPLE_RATE), total)
            if e > s:
                ramp = min(int(0.12 * SAMPLE_RATE), (e - s) // 2 or 1)
                window = np.full(e - s, duck, dtype="float32")
                window[:ramp] = np.linspace(1.0, duck, ramp)
                window[-ramp:] = np.linspace(duck, 1.0, ramp)
                gain[s:e] = np.minimum(gain[s:e], window)
        stereo *= gain[:, None]

    peak = float(np.max(np.abs(stereo)) or 1.0)
    stereo = stereo / peak * 0.72
    return _write_wav(out_path or Path("music.wav"), stereo)


SFX_RECIPES: dict[str, dict[str, Any]] = {
    "whoosh": {"kind": "noise_sweep", "duration": 0.7, "start_hz": 220, "end_hz": 3200, "gain": 0.5},
    "swoosh": {"kind": "noise_sweep", "duration": 0.9, "start_hz": 3200, "end_hz": 180, "gain": 0.45},
    "impact": {"kind": "thump", "duration": 0.5, "freq": 62, "gain": 0.85},
    "hit": {"kind": "thump", "duration": 0.32, "freq": 96, "gain": 0.7},
    "riser": {"kind": "riser", "duration": 2.2, "gain": 0.5},
    "click": {"kind": "click", "duration": 0.06, "freq": 1800, "gain": 0.55},
    "ui_tap": {"kind": "click", "duration": 0.08, "freq": 1200, "gain": 0.45},
    "page": {"kind": "noise_burst", "duration": 0.28, "gain": 0.4},
    "sparkle": {"kind": "bell", "duration": 0.9, "freq": 1760, "gain": 0.4},
    "cash": {"kind": "bell_chord", "duration": 1.1, "freq": 1320, "gain": 0.55},
    "notification": {"kind": "bell_chord", "duration": 0.7, "freq": 990, "gain": 0.45},
    "typing": {"kind": "typing", "duration": 1.2, "gain": 0.35},
    "tick": {"kind": "click", "duration": 0.04, "freq": 2600, "gain": 0.4},
    "reveal": {"kind": "bell_chord", "duration": 1.4, "freq": 660, "gain": 0.5},
}


def generate_sfx(name: str, *, gain_db: float = 0.0, seed: int = 0, out_path: Path | None = None) -> Path:
    import numpy as np

    recipe = SFX_RECIPES.get(name, SFX_RECIPES["click"])
    rng = np.random.default_rng(seed or (zlib.crc32(name.encode()) & 0xFFFF))
    duration = float(recipe["duration"])
    length = int(duration * SAMPLE_RATE)
    t = np.arange(length) / SAMPLE_RATE
    gain = float(recipe["gain"]) * (10 ** (gain_db / 20.0))
    kind = recipe["kind"]

    if kind == "noise_sweep":
        noise = rng.standard_normal(length).astype("float32")
        start_hz, end_hz = float(recipe["start_hz"]), float(recipe["end_hz"])
        sweep = np.linspace(start_hz, end_hz, length)
        filtered = np.zeros(length, dtype="float32")
        previous = 0.0
        for index in range(length):
            alpha = min(1.0, sweep[index] / (SAMPLE_RATE / 2))
            previous = previous + alpha * (noise[index] - previous)
            filtered[index] = previous
        envelope = np.sin(np.pi * np.linspace(0, 1, length)) ** 1.4
        data = filtered * envelope * gain
    elif kind == "thump":
        freq = float(recipe["freq"])
        sweep = freq + 70 * np.exp(-30 * t)
        data = np.sin(2 * np.pi * sweep * t) * np.exp(-14 * t) * gain
        data += rng.standard_normal(length) * np.exp(-160 * t) * gain * 0.25
    elif kind == "riser":
        noise = rng.standard_normal(length).astype("float32")
        data = noise * np.linspace(0.05, 1.0, length) ** 1.7 * gain
        data = _lowpass(data[:, None], 4200, SAMPLE_RATE)[:, 0]
    elif kind == "click":
        freq = float(recipe["freq"])
        data = np.sin(2 * np.pi * freq * t) * np.exp(-160 * t) * gain
        data += rng.standard_normal(length) * np.exp(-320 * t) * gain * 0.4
    elif kind == "noise_burst":
        data = rng.standard_normal(length) * np.exp(-18 * t) * gain
    elif kind == "bell":
        freq = float(recipe["freq"])
        data = sum(
            math.sin(2 * np.pi * freq * ratio * t) * np.exp(-decay * t) * weight
            for ratio, decay, weight in ((1.0, 6.0, 1.0), (2.01, 9.0, 0.4), (3.03, 12.0, 0.2))
        ) * gain
    elif kind == "bell_chord":
        freq = float(recipe["freq"])
        data = np.zeros(length, dtype="float32")
        for offset, delay in ((0, 0.0), (7, 0.06), (12, 0.12)):
            shifted = max(int(delay * SAMPLE_RATE), 0)
            tone = np.sin(2 * np.pi * _midi_to_freq(69 + offset) * t) * np.exp(-4.5 * t)
            if shifted < length:
                data[shifted:] += tone[: length - shifted] * (0.6 if offset else 1.0)
        data = data * gain * (freq / 1320.0 + 0.6)
    elif kind == "typing":
        data = np.zeros(length, dtype="float32")
        keystrokes = max(int(duration * 7), 3)
        for index in range(keystrokes):
            position = int(rng.uniform(0, duration - 0.05) * SAMPLE_RATE)
            span = min(int(0.035 * SAMPLE_RATE), length - position)
            if span <= 0:
                continue
            kt = np.arange(span) / SAMPLE_RATE
            data[position : position + span] += np.sin(2 * np.pi * rng.uniform(1400, 2400) * kt) * np.exp(-220 * kt) * 0.5
        data *= gain
    else:  # pragma: no cover - guarded by recipe table
        data = np.zeros(length, dtype="float32")

    stereo = np.stack([data, data * 0.94], axis=1).astype("float32")
    return _write_wav(out_path or Path(f"sfx_{name}.wav"), stereo)


AMBIENCE_RECIPES: dict[str, dict[str, Any]] = {
    "room_tone": {"noise": "brown", "cutoff": 420, "level": 0.5, "events": []},
    "office": {"noise": "brown", "cutoff": 700, "level": 0.6, "events": ["typing"]},
    "cafe": {"noise": "pink", "cutoff": 1500, "level": 0.8, "events": ["click", "page"]},
    "city": {"noise": "brown", "cutoff": 900, "level": 0.9, "events": ["whoosh"]},
    "rain": {"noise": "white", "cutoff": 5200, "level": 0.7, "events": []},
    "nature": {"noise": "pink", "cutoff": 2600, "level": 0.5, "events": ["sparkle"]},
    "studio": {"noise": "brown", "cutoff": 300, "level": 0.35, "events": []},
    "none": {"noise": "brown", "cutoff": 200, "level": 0.0, "events": []},
}


def generate_ambience(duration_s: float, kind: str = "room_tone", *, seed: int = 0, out_path: Path | None = None) -> Path:
    import numpy as np

    recipe = AMBIENCE_RECIPES.get(kind, AMBIENCE_RECIPES["room_tone"])
    rng = np.random.default_rng(seed)
    length = max(int(duration_s * SAMPLE_RATE), SAMPLE_RATE // 4)
    white = rng.standard_normal(length).astype("float32")
    noise_type = recipe["noise"]
    if noise_type == "brown":
        brown = np.cumsum(white)
        brown = brown / (np.max(np.abs(brown)) + 1e-9)
        data = brown * 0.7 + white * 0.05
    elif noise_type == "pink":
        spectrum = np.fft.rfft(white)
        freqs = np.fft.rfftfreq(length, 1.0 / SAMPLE_RATE)
        shaped = spectrum / np.sqrt(np.maximum(freqs, 1.0))
        data = np.fft.irfft(shaped, n=length).astype("float32")
        data = data / (np.max(np.abs(data)) + 1e-9)
    else:
        data = white
    data = _lowpass(data[:, None], float(recipe["cutoff"]), SAMPLE_RATE)[:, 0]
    # slow amplitude breathing so the bed does not sound like a static hiss
    breath = 1.0 + 0.16 * np.sin(2 * np.pi * 0.07 * np.arange(length) / SAMPLE_RATE + seed)
    data = data * breath * float(recipe["level"]) * 0.16
    stereo = np.stack([data, np.roll(data, 512)], axis=1).astype("float32")
    return _write_wav(out_path or Path(f"ambience_{kind}.wav"), stereo)


@dataclass(slots=True)
class MixTrack:
    path: str
    start_s: float = 0.0
    gain_db: float = 0.0
    fade_in_s: float = 0.0
    fade_out_s: float = 0.0
    label: str = ""


def mix_tracks(
    tracks: Sequence[MixTrack],
    destination: Path,
    *,
    duration_s: float | None = None,
    master_lufs: float = -14.0,
    master_tp: float = -1.5,
    master_lra: float = 11.0,
    sample_rate: int = SAMPLE_RATE,
) -> Path:
    """Mix stems to the YouTube loudness target using ffmpeg's EBU R128 loudnorm."""

    from .render import ffmpeg_path, run_ffmpeg

    ffmpeg = ffmpeg_path()
    if not ffmpeg:
        raise RuntimeError("ffmpeg unavailable")
    if not tracks:
        raise ValueError("no tracks to mix")
    inputs: list[str] = []
    for track in tracks:
        inputs += ["-i", str(track.path)]
    graph_parts: list[str] = []
    for index, track in enumerate(tracks):
        # ffmpeg syntax is [in]filter=...,filter=...[out] — no separator after the pad label.
        chain: list[str] = []
        if track.start_s > 0:
            delay_ms = int(track.start_s * 1000)
            chain.append(f"adelay={delay_ms}|{delay_ms}")
        if abs(track.gain_db) > 0.01:
            chain.append(f"volume={track.gain_db}dB")
        if track.fade_in_s > 0:
            chain.append(f"afade=t=in:st={track.start_s}:d={track.fade_in_s}")
        if track.fade_out_s > 0 and duration_s:
            chain.append(f"afade=t=out:st={max(duration_s - track.fade_out_s, 0)}:d={track.fade_out_s}")
        chain.append(f"aresample={sample_rate}")
        graph_parts.append(f"[{index}:a]{','.join(chain)}[a{index}]")
    labels = "".join(f"[a{index}]" for index in range(len(tracks)))
    graph_parts.append(f"{labels}amix=inputs={len(tracks)}:duration=longest:normalize=0[mixed]")
    graph_parts.append(
        f"[mixed]loudnorm=I={master_lufs}:TP={master_tp}:LRA={master_lra},aresample={sample_rate}[out]"
    )
    args = [*inputs, "-filter_complex", ";".join(graph_parts), "-map", "[out]"]
    if duration_s:
        args += ["-t", f"{duration_s:.3f}"]
    args += ["-c:a", "pcm_s16le", "-y", str(destination)]
    run_ffmpeg(args)
    return destination


def audio_duration(path: Path | str) -> float:
    try:
        with wave.open(str(path), "rb") as handle:
            return handle.getnframes() / float(handle.getframerate())
    except Exception:
        from .render import probe_duration

        return probe_duration(path)


def narration_duck_windows(segments: Sequence[dict[str, Any]]) -> list[tuple[float, float]]:
    return [(float(seg["start_s"]), float(seg["end_s"])) for seg in segments]


def backend_doctor(language: str = "ko-KR") -> dict[str, Any]:
    rows = []
    for backend in default_tts_chain(language):
        ok, reason = backend.available()
        rows.append({"backend": backend.name, "available": ok, "network": backend.requires_network, "reason": reason})
    return {"language": language, "backends": rows, "selected": select_tts(language)[0].name, "sample_rate": SAMPLE_RATE}


def which_ffmpeg() -> str:
    resolved = shutil.which("ffmpeg")
    if resolved:
        return resolved
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # pragma: no cover
        return ""


def run_local(command: Sequence[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(list(command), capture_output=True, text=True, check=False)
