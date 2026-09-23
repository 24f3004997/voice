from __future__ import annotations

from typing import Any

import numpy as np

from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------
# 1. Multilingual semantic model
# ---------------------------------------------------------
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

print("[TRANSCRIPT] Loading semantic model...")

semantic_model = SentenceTransformer(MODEL_NAME)

print("[TRANSCRIPT] Semantic model loaded.")


# ---------------------------------------------------------
# 2. Risk intents
# ---------------------------------------------------------
INTENTS = {
    "Credential request": {
        "risk": 35,
        "examples": [
            "Please tell me the verification code you received.",
            "Read the six digit number on your phone.",
            "Tell me the password.",
            "Give me the PIN.",
            "What code appeared on your screen?",
            "Phone pe jo code aaya hai woh batao.",
            "Screen par jo six digit number hai woh mujhe bolo.",
            "Apna password aur verification code batao.",
        ],
    },
    "Financial request": {
        "risk": 30,
        "examples": [
            "Please transfer the money to this account.",
            "Send the payment immediately.",
            "Move the funds to this bank account.",
            "Make this payment right now.",
            "Account mein paise transfer kar do.",
            "Abhi payment kar do.",
            "Is account mein money transfer karo.",
            "Bank se funds bhej do.",
        ],
    },
    "Urgency pressure": {
        "risk": 20,
        "examples": [
            "You need to do this right now.",
            "Act immediately.",
            "This cannot wait.",
            "You must complete this immediately.",
            "Abhi karo.",
            "Turant ye kaam karo.",
            "Isme bilkul delay mat karo.",
            "Abhi ke abhi complete karo.",
        ],
    },
    "Confidentiality pressure": {
        "risk": 25,
        "examples": [
            "Do not tell anyone about this.",
            "Keep this between us.",
            "Don't involve anyone else.",
            "This conversation must remain confidential.",
            "Kisi ko mat batana.",
            "Ye baat kisi aur ko mat bolna.",
            "Kisi ko involve mat karna.",
            "Isko secret rakhna.",
        ],
    },
    "Remote access request": {
        "risk": 30,
        "examples": [
            "Give me remote access to your computer.",
            "Install remote desktop software.",
            "Share your screen with me.",
            "Let me control your computer remotely.",
            "Remote access de do.",
            "Screen share kar do.",
            "Computer ka access mujhe de do.",
            "AnyDesk install karo aur access do.",
        ],
    },
    "Personal information request": {
        "risk": 25,
        "examples": [
            "Tell me your date of birth.",
            "Give me your home address.",
            "Tell me your identification number.",
            "Provide your personal information.",
            "Apni date of birth batao.",
            "Apna address batao.",
            "Apna identification number batao.",
            "Personal details share karo.",
        ],
    },
    "Payment redirection": {
        "risk": 35,
        "examples": [
            "Do not use the usual account, send the money here instead.",
            "Use this new bank account for the payment.",
            "The previous account is not working, transfer it here.",
            "Payment should go to this different account.",
            "Purane account mein mat bhejna.",
            "Is naye account mein payment karo.",
            "Paise is account mein bhejo.",
        ],
    },
    "Threat or coercion": {
        "risk": 30,
        "examples": [
            "If you don't do this there will be consequences.",
            "You have no choice.",
            "Do this or your account will be blocked.",
            "You must comply immediately.",
            "Agar nahi kiya toh problem ho jayegi.",
            "Tumhare paas koi option nahi hai.",
            "Abhi nahi kiya toh account block ho jayega.",
        ],
    },
}


# ---------------------------------------------------------
# 3. Keyword fallback
# ---------------------------------------------------------
KEYWORD_PATTERNS = [
    {
        "label": "Credential request",
        "risk": 35,
        "words": [
            "otp",
            "pin",
            "password",
            "verification code",
            "passcode",
        ],
    },
    {
        "label": "Financial request",
        "risk": 30,
        "words": [
            "transfer",
            "payment",
            "bank",
            "account",
            "money",
            "wire",
            "lakhs",
            "crore",
        ],
    },
    {
        "label": "Confidentiality pressure",
        "risk": 25,
        "words": [
            "don't tell",
            "do not tell",
            "keep this secret",
            "don't involve",
            "do not involve",
            "confidential",
            "kisi ko mat batana",
        ],
    },
    {
        "label": "Urgency pressure",
        "risk": 20,
        "words": [
            "urgent",
            "immediately",
            "right now",
            "as soon as possible",
            "abhi",
            "turant",
        ],
    },
]


# ---------------------------------------------------------
# 4. Pre-compute intent embeddings
# ---------------------------------------------------------
_INTENT_NAMES = list(INTENTS.keys())

_INTENT_EXAMPLES = [
    INTENTS[name]["examples"]
    for name in _INTENT_NAMES
]

_INTENT_EMBEDDINGS = []

for examples in _INTENT_EXAMPLES:
    embeddings = semantic_model.encode(
        examples,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    prototype = np.mean(
        embeddings,
        axis=0,
    )

    prototype = prototype / (
        np.linalg.norm(prototype) + 1e-12
    )

    _INTENT_EMBEDDINGS.append(
        prototype
    )

_INTENT_EMBEDDINGS = np.asarray(
    _INTENT_EMBEDDINGS
)


# ---------------------------------------------------------
# 5. Semantic analysis
# ---------------------------------------------------------
SEMANTIC_THRESHOLD = 0.55


def _semantic_scores(
    text: str,
) -> list[tuple[str, float]]:
    embedding = semantic_model.encode(
        [text],
        normalize_embeddings=True,
        convert_to_numpy=True,
    )[0]

    scores = np.dot(
        _INTENT_EMBEDDINGS,
        embedding,
    )

    results = [
        (name, float(score))
        for name, score in zip(
            _INTENT_NAMES,
            scores,
        )
    ]

    results.sort(
        key=lambda item: item[1],
        reverse=True,
    )

    return results


# ---------------------------------------------------------
# 6. Keyword analysis
# ---------------------------------------------------------
def _keyword_analysis(
    text: str,
) -> list[dict[str, Any]]:
    text_lower = text.lower()

    matches = []

    for pattern in KEYWORD_PATTERNS:
        matched_words = []

        for word in pattern["words"]:
            if word in text_lower:
                matched_words.append(word)

        if matched_words:
            matches.append(
                {
                    "label": pattern["label"],
                    "risk": pattern["risk"],
                    "matched_words": matched_words,
                }
            )

    return matches


# ---------------------------------------------------------
# 7. Main transcript risk function
# ---------------------------------------------------------
def analyze_transcript(
    text: str,
    context: str | None = None,
) -> dict[str, Any]:

    if not text or not text.strip():
        return {
            "transcript_risk": 0,
            "signals": [],
            "matched_phrases": [],
            "semantic_matches": [],
        }

    text = text.strip()

    # -----------------------------------------------------
    # Include recent conversation context when available.
    # -----------------------------------------------------
    analysis_text = text

    if context and context.strip():
        analysis_text = (
            context.strip()
            + " "
            + text
        )

    # -----------------------------------------------------
    # Keyword layer
    # -----------------------------------------------------
    keyword_matches = _keyword_analysis(
        analysis_text
    )

    # -----------------------------------------------------
    # Semantic layer
    # -----------------------------------------------------
    semantic_results = _semantic_scores(
        analysis_text
    )

    strong_semantic_matches = []

    for label, score in semantic_results:
        if score >= SEMANTIC_THRESHOLD:
            strong_semantic_matches.append(
                {
                    "label": label,
                    "score": round(score, 3),
                    "risk": INTENTS[label]["risk"],
                }
            )

    # -----------------------------------------------------
    # Combine evidence
    # -----------------------------------------------------
    signal_map: dict[str, dict[str, Any]] = {}

    # Keyword evidence
    for match in keyword_matches:
        label = match["label"]

        signal_map[label] = {
            "label": label,
            "risk": match["risk"],
            "keyword_match": True,
            "semantic_score": 0.0,
            "matched_words": match["matched_words"],
        }

    # Semantic evidence
    for match in strong_semantic_matches:
        label = match["label"]

        if label not in signal_map:
            signal_map[label] = {
                "label": label,
                "risk": INTENTS[label]["risk"],
                "keyword_match": False,
                "semantic_score": match["score"],
                "matched_words": [],
            }
        else:
            signal_map[label]["semantic_score"] = (
                match["score"]
            )

    signals = list(
        signal_map.values()
    )

    # -----------------------------------------------------
    # Risk calculation
    #
    # Strongest signal gets full weight.
    # Additional distinct signals contribute at 50%.
    #
    # This prevents:
    #   1. Multiple overlapping intents from being simply
    #      added together.
    #
    #   2. A strong semantic match from being reduced too
    #      aggressively by the old max-only approach.
    #
    # Example:
    #   Financial request       -> 21
    #   Payment redirection     -> 16
    #
    #   Final:
    #       21 + (16 * 0.5)
    #       = 29
    #
    # Maximum risk is capped at 100.
    # -----------------------------------------------------
    contributions = []

    for signal in signals:
        base_risk = signal["risk"]
        semantic_score = signal["semantic_score"]

        # Keyword matches are treated as direct evidence.
        if signal["keyword_match"]:
            contribution = base_risk

        # Semantic-only matches are scaled according to
        # how far their similarity is above the threshold.
        else:
            normalized_score = (
                (
                    semantic_score
                    - SEMANTIC_THRESHOLD
                )
                / (
                    1.0
                    - SEMANTIC_THRESHOLD
                )
            )

            normalized_score = min(
                1.0,
                max(
                    0.0,
                    normalized_score,
                ),
            )

            contribution = int(
                base_risk
                * normalized_score
            )

        contributions.append(
            contribution
        )

    # Strongest signal gets full weight.
    # Additional signals get half weight.
    contributions.sort(
        reverse=True
    )

    if contributions:
        transcript_risk = contributions[0]

        for extra in contributions[1:]:
            transcript_risk += int(
                extra * 0.5
            )

        transcript_risk = min(
            100,
            transcript_risk,
        )
    else:
        transcript_risk = 0

    # -----------------------------------------------------
    # Matched phrases
    # -----------------------------------------------------
    matched_phrases = []

    for match in keyword_matches:
        matched_phrases.extend(
            match["matched_words"]
        )

    # -----------------------------------------------------
    # Final result
    # -----------------------------------------------------
    return {
        "transcript_risk": int(
            transcript_risk
        ),
        "signals": signals,
        "matched_phrases": matched_phrases,
        "semantic_matches": strong_semantic_matches,
    }

