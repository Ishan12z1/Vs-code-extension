from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.planner.schemas import PlanRequest
from app.planner.schemas.contracts import RequestClass

ClassificationSource = Literal["hint", "rule", "fallback"]


class RequestClassification(BaseModel):
    """
    Backend-only resolved classification result.

    Important:
    - this is NOT a shared public API contract
    - it is internal planner state used before provider execution
    """

    model_config = ConfigDict(extra="forbid")

    requestClass: RequestClass
    source: ClassificationSource
    reason: str
    warnings: list[str] = Field(default_factory=list)

    # Early unsupported detection for clearly out-of-scope asks.
    isSupported: bool = True
    unsupportedReason: str | None = None


class RequestClassifier:
    """
    Small rule-first request classifier.

    Why rule-first:
    - Step 6.2 is about building a deterministic classification workflow
    - we do not need model-based classification yet
    - this keeps behavior easy to test and easy to reason about
    """

    _UNSUPPORTED_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\brun\b.*\bshell\b"),
        re.compile(r"\bterminal command(s)?\b"),
        re.compile(r"\bbash command(s)?\b"),
        re.compile(r"\bimplement\b.*\bfeature\b"),
        re.compile(r"\bwrite\b.*\bapplication code\b"),
        re.compile(r"\bedit\b.*\brepo\b.*\bsource\b"),
        re.compile(r"\brefactor\b.*\bcodebase\b"),
    )

    _EXPLAIN_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\bexplain\b"),
        re.compile(r"\bwhy\b"),
        re.compile(r"\bwhat is happening\b"),
        re.compile(r"\bwhat'?s happening\b"),
        re.compile(r"\bwhat does\b.*\bdo\b"),
    )

    _INSPECT_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\binspect\b"),
        re.compile(r"\bshow\b.*\bsetup\b"),
        re.compile(r"\bcurrent\b.*\bsetup\b"),
        re.compile(r"\bcurrent\b.*\bconfiguration\b"),
        re.compile(r"\bwhat do i have\b"),
        re.compile(r"\bscan\b.*\bworkspace\b"),
    )

    _CONFIGURE_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\benable\b"),
        re.compile(r"\bdisable\b"),
        re.compile(r"\bset up\b"),
        re.compile(r"\bsetup\b"),
        re.compile(r"\bconfigure\b"),
        re.compile(r"\bchange\b"),
        re.compile(r"\bupdate\b"),
        re.compile(r"\badd\b"),
        re.compile(r"\bset\b"),
        re.compile(r"\bturn on\b"),
        re.compile(r"\bturn off\b"),
        re.compile(r"\buse\b.*\bonly\b"),
    )

    _REPAIR_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\bfix\b"),
        re.compile(r"\brepair\b"),
        re.compile(r"\bbroken\b"),
        re.compile(r"\bnot working\b"),
        re.compile(r"\bdoesn'?t work\b"),
        re.compile(r"\bisn'?t working\b"),
        re.compile(r"\bfailed\b"),
        re.compile(r"\bproblem\b"),
        re.compile(r"\bissue\b"),
    )

    _GUIDE_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\bhow should i\b"),
        re.compile(r"\bwhat should i\b"),
        re.compile(r"\bwhere should\b"),
        re.compile(r"\bwhich\b.*\bshould i use\b"),
        re.compile(r"\bdo this globally instead\b"),
        re.compile(r"\buser settings or workspace settings\b"),
    )

    # Strong leading-intent signals. These should outweigh softer secondary words
    # like "setup" when the user starts with an explicit intent verb.
    _LEADING_EXPLAIN_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"^\s*explain\b"),
        re.compile(r"^\s*why\b"),
    )

    _LEADING_INSPECT_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"^\s*inspect\b"),
        re.compile(r"^\s*show\b"),
        re.compile(r"^\s*scan\b"),
    )

    _LEADING_CONFIGURE_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"^\s*enable\b"),
        re.compile(r"^\s*disable\b"),
        re.compile(r"^\s*configure\b"),
        re.compile(r"^\s*set up\b"),
        re.compile(r"^\s*setup\b"),
        re.compile(r"^\s*change\b"),
        re.compile(r"^\s*update\b"),
        re.compile(r"^\s*add\b"),
        re.compile(r"^\s*set\b"),
        re.compile(r"^\s*turn on\b"),
        re.compile(r"^\s*turn off\b"),
    )

    _LEADING_REPAIR_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"^\s*fix\b"),
        re.compile(r"^\s*repair\b"),
    )

    def classify(self, payload: PlanRequest) -> RequestClassification:
        """
        Resolve one internal request class from:
        - request text
        - optional requestClassHint

        Resolution policy:
        - reject obviously unsupported asks early
        - prefer clear rule-based classification from text
        - treat requestClassHint as a hint, not as truth
        - allow explain/inspect hints to stay stable when the text is soft/ambiguous
        """
        text = self._normalize_text(payload.userRequest.text)
        hint = payload.userRequest.requestClassHint
        warnings: list[str] = []

        unsupported_reason = self._get_unsupported_reason(text)
        if unsupported_reason is not None:
            return RequestClassification(
                requestClass=hint or "guide",
                source="rule" if hint is None else "hint",
                reason="Detected an out-of-scope request before planner execution.",
                warnings=warnings,
                isSupported=False,
                unsupportedReason=unsupported_reason,
            )

        rule_class, rule_reason = self._classify_from_rules(text)

        if hint is None:
            return RequestClassification(
                requestClass=rule_class,
                source="rule" if rule_reason != self._fallback_reason() else "fallback",
                reason=rule_reason,
                warnings=warnings,
            )

        if hint == rule_class:
            return RequestClassification(
                requestClass=hint,
                source="hint",
                reason=(
                    f"Accepted requestClassHint '{hint}' because it matches the "
                    f"rule-based classification."
                ),
                warnings=warnings,
            )

        if self._is_soft_explain_inspect_conflict(hint=hint, resolved=rule_class):
            warnings.append(
                f"Text heuristics leaned toward '{rule_class}', but kept the "
                f"user hint '{hint}' because explain/inspect overlap is soft."
            )
            return RequestClassification(
                requestClass=hint,
                source="hint",
                reason=(
                    f"Kept requestClassHint '{hint}' because the conflict with "
                    f"'{rule_class}' is not strong enough to override."
                ),
                warnings=warnings,
            )

        warnings.append(
            f"Overrode requestClassHint '{hint}' with '{rule_class}' based on the request text."
        )
        return RequestClassification(
            requestClass=rule_class,
            source="rule",
            reason=rule_reason,
            warnings=warnings,
        )

    def _classify_from_rules(self, text: str) -> tuple[RequestClass, str]:
        """
        Score each request class using lightweight regex rules and return the best match.

        Priority on ties:
        - repair
        - configure
        - inspect
        - explain
        - guide

        Why:
        - repair/configure language is usually more action-specific
        - explain/inspect are often softer and broader

        Additional rule:
        - a leading intent verb gets extra weight so explicit asks like
          "Explain my current VS Code setup" do not get misread as configure
          just because they contain the noun "setup"
        """
        scores: dict[RequestClass, int] = {
            "explain": self._score_patterns(text, self._EXPLAIN_PATTERNS),
            "inspect": self._score_patterns(text, self._INSPECT_PATTERNS),
            "configure": self._score_patterns(text, self._CONFIGURE_PATTERNS),
            "repair": self._score_patterns(text, self._REPAIR_PATTERNS),
            "guide": self._score_patterns(text, self._GUIDE_PATTERNS),
        }

        # Strong boost for explicit leading intent verbs.
        scores["explain"] += 3 * self._score_patterns(text, self._LEADING_EXPLAIN_PATTERNS)
        scores["inspect"] += 3 * self._score_patterns(text, self._LEADING_INSPECT_PATTERNS)
        scores["configure"] += 3 * self._score_patterns(text, self._LEADING_CONFIGURE_PATTERNS)
        scores["repair"] += 3 * self._score_patterns(text, self._LEADING_REPAIR_PATTERNS)

        best_class: RequestClass = "guide"
        best_score = 0

        for candidate in ("repair", "configure", "inspect", "explain", "guide"):
            score = scores[candidate]
            if score > best_score:
                best_class = candidate
                best_score = score

        if best_score > 0:
            return best_class, (
                f"Resolved request class '{best_class}' from text using rule-based "
                f"keyword matching."
            )

        if "?" in text:
            return "guide", (
                "No strong action or diagnosis verb matched; defaulted to 'guide' "
                "because the request is phrased as a question."
            )

        return "guide", self._fallback_reason()

    def _score_patterns(self, text: str, patterns: tuple[re.Pattern[str], ...]) -> int:
        """
        Count how many patterns match the text.

        This is intentionally simple and deterministic for Step 6.2.
        """
        return sum(1 for pattern in patterns if pattern.search(text))

    def _get_unsupported_reason(self, text: str) -> str | None:
        """
        Return an unsupported reason when the request is clearly outside v1 scope.
        """
        for pattern in self._UNSUPPORTED_PATTERNS:
            if pattern.search(text):
                return (
                    "This request is outside the supported VS Code Control Agent v1 "
                    "scope. The product does not execute arbitrary shell commands or "
                    "act as a general coding agent."
                )
        return None

    def _is_soft_explain_inspect_conflict(
        self,
        *,
        hint: RequestClass,
        resolved: RequestClass,
    ) -> bool:
        """
        Explain vs inspect often overlap in natural language.
        That conflict is softer than configure vs explain or repair vs explain.
        """
        return {hint, resolved} == {"explain", "inspect"}

    def _normalize_text(self, text: str) -> str:
        """
        Lowercase and collapse whitespace so the rule checks stay stable.
        """
        return re.sub(r"\s+", " ", text.strip().lower())

    def _fallback_reason(self) -> str:
        """
        Shared fallback reason string.
        """
        return (
            "No strong rule matched the request text; defaulted to 'guide' as the "
            "safest non-execution category."
        )
