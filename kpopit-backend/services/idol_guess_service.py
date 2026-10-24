from utils.game_feedback_logic import partial_feedback_function, numerical_feedback_function


class IdolGuessService:
    """Feedback for one Classic/Blurry guess against an answer, always built from current idol data.
    The guess routes and restore-session share it, so a restored game shows the same squares."""

    def __init__(self, repository):
        self.repository = repository

    def _load_idol(self, idol_id: int) -> dict | None:
        row = self.repository.fetch_full_idol_data(idol_id)
        if not row:
            return None
        idol = dict(row)
        group_id = idol.get("group_id")
        idol["career"] = self.repository.fetch_full_idol_career(idol["idol_id"])
        idol["companies"] = self.repository.fetch_idol_companies(idol["idol_id"])
        idol["group_companies"] = self.repository.fetch_group_companies(group_id) if group_id else []
        for field in ["nationality", "position"]:
            if idol.get(field) and isinstance(idol[field], str):
                idol[field] = [item.strip() for item in idol[field].split(",")]
            else:
                idol[field] = idol.get(field) or []
        return idol

    @staticmethod
    def _exact(guessed: dict, answer: dict, field: str) -> dict:
        if guessed.get(field) == answer.get(field):
            return {"status": "correct", "correct_items": [guessed.get(field)], "incorrect_items": []}
        return {"status": "incorrect", "correct_items": [], "incorrect_items": [guessed.get(field)]}

    def classic_result(self, guessed_id: int, answer_id: int) -> dict | None:
        """The Classic guess response body without card_granted; None if either idol is unknown."""
        guessed_idol = self._load_idol(guessed_id)
        answer_data = self._load_idol(answer_id)
        if not guessed_idol or not answer_data:
            return None

        feedback = {}
        feedback["position"] = partial_feedback_function(
            set(p.strip() for p in guessed_idol["position"]), set(p.strip() for p in answer_data["position"]),
            unknown_if_empty=True,
        )
        feedback["nationality"] = partial_feedback_function(
            set(n.strip() for n in guessed_idol["nationality"]), set(n.strip() for n in answer_data["nationality"]),
            unknown_if_empty=True,
        )
        numerical_fields = ["idol_debut_year", "height", "birth_date", "member_count"]
        feedback.update(numerical_feedback_function(guessed_idol, answer_data, numerical_fields))
        feedback["groups"] = partial_feedback_function(
            set(group["group_name"] for group in guessed_idol["career"]),
            set(group["group_name"] for group in answer_data["career"]),
        )
        companies_guess = ({c["name"] for c in guessed_idol["companies"]}
                           | {c["name"] for c in guessed_idol["group_companies"]})
        companies_answer = ({c["name"] for c in answer_data["companies"]}
                            | {c["name"] for c in answer_data["group_companies"]})
        feedback["companies"] = partial_feedback_function(companies_guess, companies_answer)
        for field in ["artist_name", "gender"]:
            feedback[field] = self._exact(guessed_idol, answer_data, field)

        keys_for_display = [
            "idol_id", "artist_name", "gender", "nationality", "idol_debut_year",
            "birth_date", "height", "position", "image_path", "member_count",
        ]
        data_for_display = {key: guessed_idol.get(key) for key in keys_for_display}

        active_groups = [group["group_name"] for group in guessed_idol["career"] if group.get("is_active")]
        # No active group: her most recent past group (see CURRENT_CAREER_CTE in idol_repository.py)
        if not active_groups and guessed_idol.get("is_former_group"):
            active_groups = [guessed_idol["group_name"]]
        data_for_display["groups"] = [group["group_name"] for group in guessed_idol["career"]]
        data_for_display["active_group"] = active_groups[0] if active_groups else None
        data_for_display["companies"] = ([c["name"] for c in guessed_idol["companies"]]
                                         + [c["name"] for c in guessed_idol["group_companies"]])

        return {
            "guess_correct": guessed_idol["idol_id"] == answer_data["idol_id"],
            "feedback": feedback,
            "guessed_idol_data": data_for_display,
        }

    def blurry_result(self, guessed_id: int, answer_id: int) -> dict | None:
        """The Blurry guess response body without card_granted; None if either idol is unknown."""
        guessed_idol = self.repository.fetch_full_idol_data(guessed_id)
        answer_data = self.repository.fetch_full_idol_data(answer_id)
        if not guessed_idol or not answer_data:
            return None
        guessed_idol, answer_data = dict(guessed_idol), dict(answer_data)
        return {
            "guess_correct": guessed_idol["idol_id"] == answer_data["idol_id"],
            "feedback": {field: self._exact(guessed_idol, answer_data, field) for field in ["idol_id", "artist_name"]},
            "guessed_idol_data": {key: guessed_idol.get(key) for key in ["idol_id", "artist_name", "image_path"]},
        }
